const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { nextRef } = require('../utils/refGenerator');
const { logAudit } = require('../utils/audit');
const { notify } = require('../utils/notify');
const { mapMaterialReturn, resolveItemId } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = `
  SELECT mr.*, i.name AS item_name, s.name AS store_name
  FROM material_returns mr
  LEFT JOIN items i ON i.id = mr.item_id
  LEFT JOIN stores s ON s.id = i.store_id
`;

const list = asyncHandler(async (req, res) => {
  let scope = '';
  let params = [];

  if (req.user.role === 'Department Head') {
    scope = 'WHERE mr.department = $1 OR mr.created_by = $2';
    params = [req.user.department || '', req.user.name];
  } else if (['Store Head', 'Storekeeper'].includes(req.user.role) && req.user.store) {
    scope = 'WHERE s.name = $1';
    params = [req.user.store];
  }

  const { rows } = await query(`${SELECT} ${scope} ORDER BY mr.id DESC`, params);
  res.json(rows.map(mapMaterialReturn));
});

const getOne = asyncHandler(async (req, res) => {
  let scope = '';
  let params = [req.params.id];

  if (req.user.role === 'Department Head') {
    scope = ' AND (mr.department = $2 OR mr.created_by = $3)';
    params.push(req.user.department || '', req.user.name);
  } else if (['Store Head', 'Storekeeper'].includes(req.user.role) && req.user.store) {
    scope = ' AND s.name = $2';
    params.push(req.user.store);
  }

  const { rows } = await query(`${SELECT} WHERE mr.id = $1${scope}`, params);
  if (!rows[0]) throw new AppError('Material return not found.', 404);
  res.json(mapMaterialReturn(rows[0]));
});

// POST /api/material-returns — Backend-SRS §6.3 step 1 (Draft, no stock change)
const create = asyncHandler(async (req, res) => {
  const { department, item, qty, reason, date, condition, originalIssueRef } = req.body;
  if (!department || !item || !qty) throw new AppError('department, item, and qty are required.', 400);

  const result = await withTransaction(async (client) => {
    const itemId = await resolveItemId(item, client);
    if (!itemId) throw new AppError(`Unknown item: "${item}".`, 400);
    const srnRef = await nextRef(client, 'SRN');

    const { rows } = await client.query(
      `INSERT INTO material_returns (srn_ref, department, created_by, item_id, qty, reason, date, status, condition, original_issue_ref)
      VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7, CURRENT_DATE),'Draft',$8,$9) RETURNING id`,
      [srnRef, department, req.user.name, itemId, qty, reason || null, date || null, condition || null, originalIssueRef || null]
    );

    await logAudit(client, { userName: req.user.name, action: `Created return ${srnRef}`, module: 'Material Return' });

    const { rows: full } = await client.query(`${SELECT} WHERE mr.id = $1`, [rows[0].id]);
    return mapMaterialReturn(full[0]);
  });

  res.status(201).json(result);
});

// POST /api/material-returns/:id/submit
const submit = asyncHandler(async (req, res) => {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query('SELECT status, srn_ref FROM material_returns WHERE id = $1 FOR UPDATE', [req.params.id]);
    const ret = rows[0];
    if (!ret) throw new AppError('Material return not found.', 404);
    if (ret.status !== 'Draft' && ret.status !== 'Pending') {
      throw new AppError(`Cannot submit return in status: ${ret.status}`, 400);
    }
    await client.query('UPDATE material_returns SET status = $1, updated_at = NOW() WHERE id = $2', ['Submitted', req.params.id]);
    await logAudit(client, { userName: req.user.name, action: `Submitted return ${ret.srn_ref}`, module: 'Material Return' });
    await notify(client, {
      role: 'Store Head',
      title: 'Material return awaiting inspection',
      message: `${ret.srn_ref} is ready for store review.`,
      type: 'warning',
      route: '/material-return',
      entityType: 'material_return',
      entityId: req.params.id
    });
    const { rows: full } = await client.query(`${SELECT} WHERE mr.id = $1`, [req.params.id]);
    return mapMaterialReturn(full[0]);
  });
  res.json(result);
});

// POST /api/material-returns/:id/approve — Backend-SRS §6.3 steps 2-3
const decide = asyncHandler(async (req, res) => {
  const { decision, qtyApproved, findings, recommendation } = req.body;
  if (!['Approved', 'Rejected'].includes(decision)) throw new AppError('decision must be "Approved" or "Rejected".', 400);

  await withTransaction((client) =>
    stockService.decideMaterialReturn(client, { returnId: req.params.id, decision, qtyApproved, findings, recommendation, actorName: req.user.name })
  );

  const { rows } = await query(`${SELECT} WHERE mr.id = $1`, [req.params.id]);
  res.json(mapMaterialReturn(rows[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows: check } = await query('SELECT status FROM material_returns WHERE id = $1', [req.params.id]);
  if (!check[0]) throw new AppError('Material return not found.', 404);
  if (!['Draft', 'Submitted', 'Pending Review', 'Pending'].includes(check[0].status)) throw new AppError('Cannot delete a material return that has already been processed.', 400);

  const { rows } = await query('DELETE FROM material_returns WHERE id = $1 RETURNING srn_ref', [req.params.id]);
  await logAudit(query, { userName: req.user.name, action: `Deleted return ${rows[0].srn_ref}`, module: 'Material Return' });
  res.status(204).send();
});

module.exports = { list, getOne, create, submit, decide, remove };
