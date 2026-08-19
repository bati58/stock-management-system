const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { mapMaterialTransfer, resolveStoreId, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT mt.*, fs.name AS from_store_name, ts.name AS to_store_name, i.name AS item_name
  FROM material_transfers mt
  LEFT JOIN stores fs ON fs.id = mt.from_store_id
  LEFT JOIN stores ts ON ts.id = mt.to_store_id
  LEFT JOIN items i ON i.id = mt.item_id
`;

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY mt.id DESC`);
  res.json(rows.map(mapMaterialTransfer));
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE mt.id = $1`, [req.params.id]);
  if (!rows[0]) throw new AppError('Material transfer not found.', 404);
  res.json(mapMaterialTransfer(rows[0]));
});

// POST /api/material-transfers — Backend-SRS §6.4 step 1 (Pending, no stock change)
const create = asyncHandler(async (req, res) => {
  const { fromStore, toStore, item, qty, date } = req.body;
  if (!fromStore || !toStore || !item || !qty) {
    throw new AppError('fromStore, toStore, item, and qty are required.', 400);
  }

  const result = await withTransaction(async (client) => {
    const fromStoreId = await resolveStoreId(fromStore, client);
    const toStoreId = await resolveStoreId(toStore, client);
    const itemId = await resolveItemId(item, client);
    if (!itemId) throw new AppError(`Unknown item: "${item}".`, 400);
    const transferRef = await nextRef(client, 'TRF');

    const { rows } = await client.query(
      `INSERT INTO material_transfers (transfer_ref, from_store_id, to_store_id, item_id, qty, date, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, CURRENT_DATE),'Pending') RETURNING id`,
      [transferRef, fromStoreId, toStoreId, itemId, qty, date || null]
    );

    await logAudit(client, { userName: req.user.name, action: `Created transfer ${transferRef}`, module: 'Material Transfer' });

    const { rows: full } = await client.query(`${SELECT} WHERE mt.id = $1`, [rows[0].id]);
    return mapMaterialTransfer(full[0]);
  });

  res.status(201).json(result);
});

// POST /api/material-transfers/:id/approve — Backend-SRS §6.4 step 2
const decide = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw new AppError('decision must be "Approved" or "Rejected".', 400);

  await withTransaction((client) =>
    stockService.decideMaterialTransfer(client, { transferId: req.params.id, decision, actorName: req.user.name })
  );

  const { rows } = await query(`${SELECT} WHERE mt.id = $1`, [req.params.id]);
  res.json(mapMaterialTransfer(rows[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM material_transfers WHERE id = $1 RETURNING transfer_ref', [req.params.id]);
  if (!rows[0]) throw new AppError('Material transfer not found.', 404);
  await logAudit(query, { userName: req.user.name, action: `Deleted transfer ${rows[0].transfer_ref}`, module: 'Material Transfer' });
  res.status(204).send();
});

module.exports = { list, getOne, create, decide, remove };
