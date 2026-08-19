const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { mapMaterialReturn, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT mr.*, i.name AS item_name
  FROM material_returns mr
  LEFT JOIN items i ON i.id = mr.item_id
`;

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY mr.id DESC`);
  res.json(rows.map(mapMaterialReturn));
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE mr.id = $1`, [req.params.id]);
  if (!rows[0]) throw new AppError('Material return not found.', 404);
  res.json(mapMaterialReturn(rows[0]));
});

// POST /api/material-returns — Backend-SRS §6.3 step 1 (Pending, no stock change)
const create = asyncHandler(async (req, res) => {
  const { department, item, qty, reason, date } = req.body;
  if (!department || !item || !qty) throw new AppError('department, item, and qty are required.', 400);

  const result = await withTransaction(async (client) => {
    const itemId = await resolveItemId(item, client);
    if (!itemId) throw new AppError(`Unknown item: "${item}".`, 400);
    const srnRef = await nextRef(client, 'SRN');

    const { rows } = await client.query(
      `INSERT INTO material_returns (srn_ref, department, item_id, qty, reason, date, status)
       VALUES ($1,$2,$3,$4,$5,COALESCE($6, CURRENT_DATE),'Pending') RETURNING id`,
      [srnRef, department, itemId, qty, reason || null, date || null]
    );

    await logAudit(client, { userName: req.user.name, action: `Created return ${srnRef}`, module: 'Material Return' });

    const { rows: full } = await client.query(`${SELECT} WHERE mr.id = $1`, [rows[0].id]);
    return mapMaterialReturn(full[0]);
  });

  res.status(201).json(result);
});

// POST /api/material-returns/:id/approve — Backend-SRS §6.3 steps 2-3
const decide = asyncHandler(async (req, res) => {
  const { decision } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw new AppError('decision must be "Approved" or "Rejected".', 400);

  await withTransaction((client) =>
    stockService.decideMaterialReturn(client, { returnId: req.params.id, decision, actorName: req.user.name })
  );

  const { rows } = await query(`${SELECT} WHERE mr.id = $1`, [req.params.id]);
  res.json(mapMaterialReturn(rows[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM material_returns WHERE id = $1 RETURNING srn_ref', [req.params.id]);
  if (!rows[0]) throw new AppError('Material return not found.', 404);
  await logAudit(query, { userName: req.user.name, action: `Deleted return ${rows[0].srn_ref}`, module: 'Material Return' });
  res.status(204).send();
});

module.exports = { list, getOne, create, decide, remove };
