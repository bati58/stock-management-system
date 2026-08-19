const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { mapGoodsReceipt, resolveStoreId, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT g.*, s.name AS store_name
  FROM goods_receipts g
  LEFT JOIN stores s ON s.id = g.store_id
`;

async function fetchWithLines(id, dbClient = { query }) {
  const { rows } = await dbClient.query(`${SELECT} WHERE g.id = $1`, [id]);
  if (!rows[0]) return null;
  const { rows: lines } = await dbClient.query(
    `SELECT gi.*, i.name AS item_name FROM goods_receipt_items gi JOIN items i ON i.id = gi.item_id WHERE gi.goods_receipt_id = $1`,
    [id]
  );
  return mapGoodsReceipt(rows[0], lines);
}

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY g.id DESC`);
  const results = [];
  for (const row of rows) {
    const { rows: lines } = await query(
      `SELECT gi.*, i.name AS item_name FROM goods_receipt_items gi JOIN items i ON i.id = gi.item_id WHERE gi.goods_receipt_id = $1`,
      [row.id]
    );
    results.push(mapGoodsReceipt(row, lines));
  }
  res.json(results);
});

const getOne = asyncHandler(async (req, res) => {
  const grn = await fetchWithLines(req.params.id);
  if (!grn) throw new AppError('Goods receipt not found.', 404);
  res.json(grn);
});

// POST /api/goods-receipts — Backend-SRS §6.1 step 1 (Pending only, no stock change)
const create = asyncHandler(async (req, res) => {
  const { supplier, poRef, receivedDate, receivedBy, store, items } = req.body;
  if (!supplier || !receivedDate || !store || !Array.isArray(items) || items.length === 0) {
    throw new AppError('supplier, receivedDate, store, and at least one item are required.', 400);
  }

  const result = await withTransaction(async (client) => {
    const storeId = await resolveStoreId(store, client);
    const grnRef = await nextRef(client, 'GRN');

    const { rows } = await client.query(
      `INSERT INTO goods_receipts (grn_ref, supplier, po_ref, received_date, received_by, store_id, status)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending') RETURNING id`,
      [grnRef, supplier, poRef || null, receivedDate, receivedBy || req.user.name, storeId]
    );
    const grnId = rows[0].id;

    for (const line of items) {
      const itemId = await resolveItemId(line.item, client);
      if (!itemId) throw new AppError(`Unknown item on this receipt: "${line.item}".`, 400);
      await client.query(
        'INSERT INTO goods_receipt_items (goods_receipt_id, item_id, qty, unit_price) VALUES ($1,$2,$3,$4)',
        [grnId, itemId, line.qty, line.unitPrice]
      );
    }

    await logAudit(client, { userName: req.user.name, action: `Created ${grnRef}`, module: 'Goods Receipt' });

    return fetchWithLines(grnId, client);
  });

  res.status(201).json(result);
});

// POST /api/goods-receipts/:id/evaluate — Backend-SRS §6.1 steps 2-4
const evaluate = asyncHandler(async (req, res) => {
  const { decision, evaluationNote } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) {
    throw new AppError('decision must be "Approved" or "Rejected".', 400);
  }

  await withTransaction(async (client) => {
    if (decision === 'Approved') {
      await stockService.approveGoodsReceipt(client, {
        grnId: req.params.id,
        evaluationNote,
        evaluatedBy: req.user.name,
        actorName: req.user.name
      });
    } else {
      await stockService.rejectGoodsReceipt(client, {
        grnId: req.params.id,
        evaluationNote,
        evaluatedBy: req.user.name,
        actorName: req.user.name
      });
    }
  });

  const grn = await fetchWithLines(req.params.id);
  res.json(grn);
});

const setStatus = asyncHandler(async (req, res) => {
  const allowed = ['Draft', 'Submitted', 'Pending', 'Pending Evaluation', 'Under Evaluation'];
  if (!allowed.includes(req.body.status)) throw new AppError('Invalid goods receipt workflow status.', 400);
  const { rows } = await query(
    `UPDATE goods_receipts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id`,
    [req.body.status, req.params.id]
  );
  if (!rows[0]) throw new AppError('Goods receipt not found.', 404);
  res.json(await fetchWithLines(req.params.id));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM goods_receipts WHERE id = $1 RETURNING grn_ref', [req.params.id]);
  if (!rows[0]) throw new AppError('Goods receipt not found.', 404);
  await logAudit(query, { userName: req.user.name, action: `Deleted ${rows[0].grn_ref}`, module: 'Goods Receipt' });
  res.status(204).send();
});

module.exports = { list, getOne, create, evaluate, setStatus, remove };
