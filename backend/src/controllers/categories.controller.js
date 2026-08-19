const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/audit');
const { mapCategory, resolveStoreId } = require('./_helpers');

const SELECT = `
  SELECT c.*, s.name AS store_name
  FROM categories c
  LEFT JOIN stores s ON s.id = c.store_id
`;

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY c.id`);
  res.json(rows.map(mapCategory));
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE c.id = $1`, [req.params.id]);
  if (!rows[0]) throw new AppError('Category not found.', 404);
  res.json(mapCategory(rows[0]));
});

const create = asyncHandler(async (req, res) => {
  const { code, name, store, description } = req.body;
  if (!code || !name) throw new AppError('code and name are required.', 400);
  const storeId = await resolveStoreId(store);

  const { rows } = await query(
    'INSERT INTO categories (code, name, store_id, description) VALUES ($1, $2, $3, $4) RETURNING id',
    [code, name, storeId, description || null]
  );

  await logAudit(query, { userName: req.user.name, action: `Created category ${name}`, module: 'Item Category' });

  const { rows: full } = await query(`${SELECT} WHERE c.id = $1`, [rows[0].id]);
  res.status(201).json(mapCategory(full[0]));
});

const update = asyncHandler(async (req, res) => {
  const { code, name, store, description } = req.body;
  const storeId = store !== undefined ? await resolveStoreId(store) : undefined;

  const { rows } = await query(
    `UPDATE categories SET
       code = COALESCE($1, code), name = COALESCE($2, name),
       store_id = COALESCE($3, store_id), description = COALESCE($4, description),
       updated_at = NOW()
     WHERE id = $5 RETURNING id`,
    [code, name, storeId, description, req.params.id]
  );
  if (!rows[0]) throw new AppError('Category not found.', 404);

  await logAudit(query, { userName: req.user.name, action: `Updated category ${name || ''}`, module: 'Item Category' });

  const { rows: full } = await query(`${SELECT} WHERE c.id = $1`, [rows[0].id]);
  res.json(mapCategory(full[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM categories WHERE id = $1 RETURNING name', [req.params.id]);
  if (!rows[0]) throw new AppError('Category not found.', 404);

  await logAudit(query, { userName: req.user.name, action: `Deleted category ${rows[0].name}`, module: 'Item Category' });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
