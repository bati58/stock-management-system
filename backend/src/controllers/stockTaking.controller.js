const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { resolveStoreId, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT st.*, s.name AS store_name
  FROM stock_taking_sessions st
  JOIN stores s ON s.id = st.store_id
`;

function mapSession(row, items = []) {
    return {
        id: row.id,
        sessionRef: row.session_ref,
        store: row.store_name,
        countDate: row.count_date,
        status: row.status,
        createdBy: row.created_by,
        approvedBy: row.approved_by,
        approvedAt: row.approved_at,
        closedBy: row.closed_by,
        closedAt: row.closed_at,
        items: items.map((item) => ({
            id: item.id,
            item: item.item_name,
            bin: item.bin,
            systemQty: Number(item.system_qty),
            physicalQty: Number(item.physical_qty),
            variance: Number(item.variance),
            reason: item.reason,
            counter: item.counter,
            verifiedBy: item.verified_by,
            adjustmentRef: item.adjustment_ref
        }))
    };
}

async function fetchSession(id, dbClient = { query }) {
    const { rows } = await dbClient.query(`${SELECT} WHERE st.id = $1`, [id]);
    if (!rows[0]) return null;
    const { rows: items } = await dbClient.query(
        `SELECT sti.*, i.name AS item_name FROM stock_taking_items sti JOIN items i ON i.id = sti.item_id WHERE sti.session_id = $1 ORDER BY sti.id`,
        [id]
    );
    return mapSession(rows[0], items);
}

const list = asyncHandler(async (req, res) => {
    const { rows } = await query(`${SELECT} ORDER BY st.id DESC`);
    const results = [];
    for (const row of rows) results.push(await fetchSession(row.id));
    res.json(results);
});

const getOne = asyncHandler(async (req, res) => {
    const session = await fetchSession(req.params.id);
    if (!session) throw new AppError('Stock-taking session not found.', 404);
    res.json(session);
});

const create = asyncHandler(async (req, res) => {
    const { store, countDate, items } = req.body;
    if (!store || !Array.isArray(items) || items.length === 0) throw new AppError('store and at least one counted item are required.', 400);

    const result = await withTransaction(async (client) => {
        const storeId = await resolveStoreId(store, client);

        const { rows: openSessions } = await client.query(
            `SELECT session_ref FROM stock_taking_sessions WHERE store_id = $1 AND status IN ('Draft', 'Pending Approval')`,
            [storeId]
        );
        if (openSessions.length > 0) {
            throw new AppError(`There is already an open stock-taking session (${openSessions[0].session_ref}) for this store. Please complete or cancel it first.`, 400);
        }

        const sessionRef = await nextRef(client, 'STK');
        const { rows } = await client.query(
            `INSERT INTO stock_taking_sessions (session_ref, store_id, count_date, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
            [sessionRef, storeId, countDate || null, req.user.name]
        );
        for (const line of items) {
            const itemId = await resolveItemId(line.item, client);
            if (!itemId) throw new AppError(`Unknown item: "${line.item}".`, 400);
            const { rows: stockRows } = await client.query('SELECT qty_on_hand, store_id, bin FROM items WHERE id = $1 AND store_id = $2', [itemId, storeId]);
            if (!stockRows[0]) throw new AppError(`Item "${line.item}" does not belong to the selected store.`, 400);
            const physicalQty = Number(line.physicalQty);
            if (!Number.isFinite(physicalQty) || physicalQty < 0) throw new AppError('Physical quantity must be zero or greater.', 400);
            const systemQty = Number(stockRows[0].qty_on_hand);
            await client.query(
                `INSERT INTO stock_taking_items (session_id, item_id, bin, system_qty, physical_qty, variance, reason, counter)
         VALUES ($1, $2, $3, $4, $5, $5 - $4, $6, $7)`,
                [rows[0].id, itemId, line.bin || stockRows[0].bin, systemQty, physicalQty, line.reason || null, req.user.name]
            );
        }
        await logAudit(client, { userId: req.user.id, userName: req.user.name, userRole: req.user.role, action: `Created stock-taking session ${sessionRef}`, module: 'Stock Taking', entityType: 'stock_taking_session', entityId: rows[0].id, entityReference: sessionRef });
        return fetchSession(rows[0].id, client);
    });
    res.status(201).json(result);
});

const submit = asyncHandler(async (req, res) => {
    await withTransaction(async (client) => {
        const { rows } = await client.query('SELECT status, session_ref FROM stock_taking_sessions WHERE id = $1 FOR UPDATE', [req.params.id]);
        if (!rows[0]) throw new AppError('Stock-taking session not found.', 404);
        if (rows[0].status !== 'Draft') throw new AppError(`Cannot submit session in status: ${rows[0].status}`, 400);
        await client.query('UPDATE stock_taking_sessions SET status = $1, updated_at = NOW() WHERE id = $2', ['Submitted', req.params.id]);
        await logAudit(client, { userName: req.user.name, action: `Submitted stock-taking session ${rows[0].session_ref}`, module: 'Stock Taking' });
    });
    res.json(await fetchSession(req.params.id));
});

const approve = asyncHandler(async (req, res) => {
    await withTransaction((client) => stockService.approveStockTaking(client, { sessionId: req.params.id, actorName: req.user.name }));
    res.json(await fetchSession(req.params.id));
});

const post = asyncHandler(async (req, res) => {
    await withTransaction((client) => stockService.postStockTaking(client, { sessionId: req.params.id, actorName: req.user.name }));
    res.json(await fetchSession(req.params.id));
});

const reconciliation = asyncHandler(async (req, res) => {
    const { rows } = await query(`
    SELECT st.session_ref, st.count_date, st.status, s.name AS store, i.name AS item,
           sti.bin, sti.system_qty, sti.physical_qty, sti.variance, sti.reason, sti.adjustment_ref
    FROM stock_taking_items sti
    JOIN stock_taking_sessions st ON st.id = sti.session_id
    JOIN stores s ON s.id = st.store_id
    JOIN items i ON i.id = sti.item_id
    WHERE sti.variance <> 0
    ORDER BY st.count_date DESC, sti.id DESC
  `);
    res.json(rows.map((row) => ({ ...row, systemQty: Number(row.system_qty), physicalQty: Number(row.physical_qty), variance: Number(row.variance) })));
});

module.exports = { list, getOne, create, submit, approve, post, reconciliation };