const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { mapDisposal, resolveStoreId, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT d.*, s.name AS store_name, i.name AS item_name
  FROM disposals d
  LEFT JOIN stores s ON s.id = d.store_id
  LEFT JOIN items i ON i.id = d.item_id
`;

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY d.id DESC`);
  res.json(rows.map(mapDisposal));
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE d.id = $1`, [req.params.id]);
  if (!rows[0]) throw new AppError('Disposal request not found.', 404);
  res.json(mapDisposal(rows[0]));
});

// POST /api/disposals — Backend-SRS §6.7 step 1 (Pending, no stock change)
const create = asyncHandler(async (req, res) => {
  const { item, store, qty, reason, dateFlagged } = req.body;
  if (!item || !store || !qty) throw new AppError('item, store, and qty are required.', 400);

  const result = await withTransaction(async (client) => {
    const itemId = await resolveItemId(item, client);
    if (!itemId) throw new AppError(`Unknown item: "${item}".`, 400);
    const storeId = await resolveStoreId(store, client);
    const disposalRef = await nextRef(client, 'DSP');

    const { rows } = await client.query(
      `INSERT INTO disposals (disposal_ref, item_id, store_id, qty, reason, date_flagged, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, CURRENT_DATE),'Pending') RETURNING id`,
      [disposalRef, itemId, storeId, qty, reason || null, dateFlagged || null]
    );

    await logAudit(client, { userName: req.user.name, action: `Flagged ${disposalRef} for disposal`, module: 'Disposal Management' });

    const { rows: full } = await client.query(`${SELECT} WHERE d.id = $1`, [rows[0].id]);
    return mapDisposal(full[0]);
  });

  res.status(201).json(result);
});

// POST /api/disposals/:id/approve — Backend-SRS §6.7 step 2
const decide = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw new AppError('decision must be "Approved" or "Rejected".', 400);

  await withTransaction((client) =>
    stockService.decideDisposal(client, { disposalId: req.params.id, decision, actorName: req.user.name })
  );

  const { rows } = await query(`${SELECT} WHERE d.id = $1`, [req.params.id]);
  res.json(mapDisposal(rows[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM disposals WHERE id = $1 RETURNING disposal_ref', [req.params.id]);
  if (!rows[0]) throw new AppError('Disposal request not found.', 404);
  await logAudit(query, { userName: req.user.name, action: `Deleted disposal ${rows[0].disposal_ref}`, module: 'Disposal Management' });
  res.status(204).send();
});

module.exports = { list, getOne, create, decide, remove };
