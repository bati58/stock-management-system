const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { mapRequisition, resolveStoreId, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT r.*, s.name AS store_name
  FROM requisitions r
  LEFT JOIN stores s ON s.id = r.store_id
`;

async function fetchWithLines(id, dbClient = { query }) {
  const { rows } = await dbClient.query(`${SELECT} WHERE r.id = $1`, [id]);
  if (!rows[0]) return null;
  const { rows: lines } = await dbClient.query(
    `SELECT ri.*, i.name AS item_name FROM requisition_items ri JOIN items i ON i.id = ri.item_id WHERE ri.requisition_id = $1`,
    [id]
  );
  return mapRequisition(rows[0], lines);
}

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY r.id DESC`);
  const results = [];
  for (const row of rows) {
    const { rows: lines } = await query(
      `SELECT ri.*, i.name AS item_name FROM requisition_items ri JOIN items i ON i.id = ri.item_id WHERE ri.requisition_id = $1`,
      [row.id]
    );
    results.push(mapRequisition(row, lines));
  }
  res.json(results);
});

const getOne = asyncHandler(async (req, res) => {
  const r = await fetchWithLines(req.params.id);
  if (!r) throw new AppError('Requisition not found.', 404);
  res.json(r);
});

// POST /api/requisitions — Backend-SRS §6.2 step 1 (Pending only, no stock change)
const create = asyncHandler(async (req, res) => {
  const { department, requestedBy, date, store, items } = req.body;
  if (!department || !store || !Array.isArray(items) || items.length === 0) {
    throw new AppError('department, store, and at least one item are required.', 400);
  }

  const result = await withTransaction(async (client) => {
    const storeId = await resolveStoreId(store, client);
    const srRef = await nextRef(client, 'SR');

    const { rows } = await client.query(
      `INSERT INTO requisitions (sr_ref, department, requested_by, date, store_id, status)
       VALUES ($1,$2,$3,COALESCE($4, CURRENT_DATE),$5,'Pending') RETURNING id`,
      [srRef, department, requestedBy || req.user.name, date || null, storeId]
    );
    const reqId = rows[0].id;

    for (const line of items) {
      const itemId = await resolveItemId(line.item, client);
      if (!itemId) throw new AppError(`Unknown item on this requisition: "${line.item}".`, 400);
      await client.query('INSERT INTO requisition_items (requisition_id, item_id, qty) VALUES ($1,$2,$3)', [
        reqId,
        itemId,
        line.qty
      ]);
    }

    await logAudit(client, { userName: req.user.name, action: `Created requisition ${srRef}`, module: 'Store Requisition' });

    return fetchWithLines(reqId, client);
  });

  res.status(201).json(result);
});

// POST /api/requisitions/:id/approve — Backend-SRS §6.2 step 2 (no stock change)
const decide = asyncHandler(async (req, res) => {
  const { decision, items } = req.body;
  if (!['Approved', 'Partially Approved', 'Rejected'].includes(decision)) {
    throw new AppError('decision must be "Approved" or "Rejected".', 400);
  }

  await withTransaction((client) =>
    stockService.decideRequisition(client, { requisitionId: req.params.id, decision, items, actorName: req.user.name })
  );

  res.json(await fetchWithLines(req.params.id));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM requisitions WHERE id = $1 RETURNING sr_ref', [req.params.id]);
  if (!rows[0]) throw new AppError('Requisition not found.', 404);
  await logAudit(query, { userName: req.user.name, action: `Deleted requisition ${rows[0].sr_ref}`, module: 'Store Requisition' });
  res.status(204).send();
});

module.exports = { list, getOne, create, decide, remove };
