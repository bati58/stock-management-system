const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/audit');
const { mapItem, resolveStoreId, resolveCategoryId } = require('./_helpers');

const SELECT = `
  SELECT i.*, c.name AS category_name, s.name AS store_name
  FROM items i
  LEFT JOIN categories c ON c.id = i.category_id
  LEFT JOIN stores s ON s.id = i.store_id
`;

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY i.id`);
  res.json(rows.map(mapItem));
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} WHERE i.id = $1`, [req.params.id]);
  if (!rows[0]) throw new AppError('Item not found.', 404);
  res.json(mapItem(rows[0]));
});

const create = asyncHandler(async (req, res) => {
  const { code, name, category, store, bin, unit, minLevel, maxLevel, reorderLevel, qtyOnHand, unitPrice } = req.body;
  if (!code || !name || !store || !unit) {
    throw new AppError('code, name, store, and unit are required.', 400);
  }

  const categoryId = await resolveCategoryId(category);
  const storeId = await resolveStoreId(store);

  const { rows } = await query(
    `INSERT INTO items (code, name, category_id, store_id, bin, unit, min_level, max_level, reorder_level, qty_on_hand, unit_price)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [code, name, categoryId, storeId, bin || null, unit, minLevel || 0, maxLevel || 0, reorderLevel || 0, qtyOnHand || 0, unitPrice || 0]
  );

  await logAudit(query, { userName: req.user.name, action: `Created item ${name} (${code})`, module: 'Items & Locations' });

  const { rows: full } = await query(`${SELECT} WHERE i.id = $1`, [rows[0].id]);
  res.status(201).json(mapItem(full[0]));
});

const update = asyncHandler(async (req, res) => {
  const { code, name, category, store, bin, unit, minLevel, maxLevel, reorderLevel, qtyOnHand, unitPrice } = req.body;
  const categoryId = category !== undefined ? await resolveCategoryId(category) : undefined;
  const storeId = store !== undefined ? await resolveStoreId(store) : undefined;

  const { rows } = await query(
    `UPDATE items SET
       code = COALESCE($1, code), name = COALESCE($2, name),
       category_id = COALESCE($3, category_id), store_id = COALESCE($4, store_id),
       bin = COALESCE($5, bin), unit = COALESCE($6, unit),
       min_level = COALESCE($7, min_level), max_level = COALESCE($8, max_level),
       reorder_level = COALESCE($9, reorder_level),
       qty_on_hand = COALESCE($10, qty_on_hand), unit_price = COALESCE($11, unit_price),
       updated_at = NOW()
     WHERE id = $12 RETURNING id`,
    [code, name, categoryId, storeId, bin, unit, minLevel, maxLevel, reorderLevel, qtyOnHand, unitPrice, req.params.id]
  );
  if (!rows[0]) throw new AppError('Item not found.', 404);

  await logAudit(query, { userName: req.user.name, action: `Updated item ${name || rows[0].id}`, module: 'Items & Locations' });

  const { rows: full } = await query(`${SELECT} WHERE i.id = $1`, [rows[0].id]);
  res.json(mapItem(full[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM items WHERE id = $1 RETURNING name', [req.params.id]);
  if (!rows[0]) throw new AppError('Item not found.', 404);

  await logAudit(query, { userName: req.user.name, action: `Deleted item ${rows[0].name}`, module: 'Items & Locations' });
  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
