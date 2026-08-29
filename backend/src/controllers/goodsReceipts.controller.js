const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { mapGoodsReceipt, resolveStoreId, resolveItemId, resolveSupplierId } = require('./_helpers');
const stockService = require('../services/stockService');
const { assertTransition } = require('../utils/workflow');
const { notify } = require('../utils/notify');
const { canAct } = require('../utils/permissions');

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

// POST /api/goods-receipts — Backend-SRS §6.1 step 1 (Draft only, no stock change)
const create = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Storekeeper') {
    throw new AppError('Only the Storekeeper can create or edit a goods receipt draft.', 403);
  }

  const { supplier, poRef, receivedDate, receivedBy, store, items } = req.body;
  if (!supplier || !receivedDate || !store || !Array.isArray(items) || items.length === 0) {
    throw new AppError('supplier, receivedDate, store, and at least one item are required.', 400);
  }

  const result = await withTransaction(async (client) => {
    const storeId = await resolveStoreId(store, client);
    const supplierId = await resolveSupplierId(supplier, client);
    const grnRef = await nextRef(client, 'GRN');

    const { rows } = await client.query(
      `INSERT INTO goods_receipts (grn_ref, supplier, supplier_id, po_ref, received_date, received_by, store_id, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'Draft') RETURNING id`,
      [grnRef, supplier, supplierId, poRef || null, receivedDate, receivedBy || req.user.name, storeId]
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
  if (req.user.role !== 'Technical Evaluation Committee') {
    throw new AppError('Only the Technical Evaluation Committee can evaluate goods receipts.', 403);
  }

  const { decision, evaluationNote, findings, condition, evidence, items } = req.body;
  if (!['Approved', 'Rejected', 'Partially Approved'].includes(decision)) {
    throw new AppError('decision must be "Approved", "Partially Approved", or "Rejected".', 400);
  }

  await withTransaction(async (client) => {
    await stockService.recordGoodsReceiptEvaluation(client, {
      grnId: req.params.id,
      decision,
      evaluationNote,
      findings,
      condition,
      evidence,
      items,
      evaluatedBy: req.user.name,
      actorName: req.user.name
    });
    await notify(client, {
      role: 'Property Administration Officer',
      title: 'Goods receipt evaluation completed',
      message: `Receipt ${req.params.id} was evaluated as ${decision}.`,
      type: decision === 'Rejected' ? 'warning' : 'success',
      route: '/goods-receipt',
      entityType: 'goods_receipt',
      entityId: req.params.id
    });
  });

  const grn = await fetchWithLines(req.params.id);
  res.json(grn);
});

const generateGrn = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Storekeeper') {
    throw new AppError('Only the Storekeeper can generate the official GRN for accepted stock.', 403);
  }

  await withTransaction(async (client) => {
    await stockService.generateGrn(client, {
      grnId: req.params.id,
      generatedBy: req.user.name,
      actorName: req.user.name
    });
  });
  res.json(await fetchWithLines(req.params.id));
});

const postStock = asyncHandler(async (req, res) => {
  if (req.user.role !== 'Storekeeper') {
    throw new AppError('Only the Storekeeper can post accepted stock into inventory.', 403);
  }

  await withTransaction((client) => stockService.postGrn(client, { grnId: req.params.id, actorName: req.user.name }));
  res.json(await fetchWithLines(req.params.id));
});

const setStatus = asyncHandler(async (req, res) => {
  const allowed = ['Draft', 'Submitted', 'Pending', 'Pending Evaluation', 'Under Evaluation'];
  if (!allowed.includes(req.body.status)) throw new AppError('Invalid goods receipt workflow status.', 400);

  if (req.body.status === 'Submitted' && req.user.role !== 'Storekeeper') {
    throw new AppError('Only the Storekeeper can submit a goods receipt for review.', 403);
  }
  if (req.body.status === 'Pending Evaluation' && !canAct('goods-receipts-notify-tec', req.user.role)) {
    throw new AppError('Only the Store Head can notify the Technical Evaluation Committee.', 403);
  }
  await withTransaction(async (client) => {
    const { rows: currentRows } = await client.query('SELECT status, grn_ref FROM goods_receipts WHERE id = $1 FOR UPDATE', [req.params.id]);
    if (!currentRows[0]) throw new AppError('Goods receipt not found.', 404);
    assertTransition('goodsReceipt', currentRows[0].status, req.body.status);
    await client.query(
      `UPDATE goods_receipts SET status = $1, updated_at = NOW() WHERE id = $2`,
      [req.body.status, req.params.id]
    );
    await logAudit(client, {
      userId: req.user.id,
      userName: req.user.name,
      userRole: req.user.role,
      action: `Changed ${currentRows[0].grn_ref} status to ${req.body.status}`,
      module: 'Goods Receipt',
      entityType: 'goods_receipt',
      entityId: req.params.id,
      entityReference: currentRows[0].grn_ref,
      beforeData: { status: currentRows[0].status },
      afterData: { status: req.body.status }
    });
    if (req.body.status === 'Submitted' || req.body.status === 'Pending Evaluation') {
      await notify(client, {
        role: 'Technical Evaluation Committee',
        title: 'Goods receipt awaiting evaluation',
        message: `${currentRows[0].grn_ref} is ready for technical evaluation.`,
        type: 'warning',
        route: '/goods-receipt/evaluation',
        entityType: 'goods_receipt',
        entityId: req.params.id
      });
    }
  });

  res.json(await fetchWithLines(req.params.id));
});

const remove = asyncHandler(async (req, res) => {
  const { rows: check } = await query('SELECT status FROM goods_receipts WHERE id = $1', [req.params.id]);
  if (!check[0]) throw new AppError('Goods receipt not found.', 404);
  if (!['Draft', 'Pending', 'Pending Evaluation'].includes(check[0].status)) throw new AppError('Cannot delete a goods receipt that has already been processed.', 400);

  const { rows } = await query('DELETE FROM goods_receipts WHERE id = $1 RETURNING grn_ref', [req.params.id]);
  await logAudit(query, { userName: req.user.name, action: `Deleted ${rows[0].grn_ref}`, module: 'Goods Receipt' });
  res.status(204).send();
});

module.exports = { list, getOne, create, evaluate, generateGrn, postStock, setStatus, remove };
