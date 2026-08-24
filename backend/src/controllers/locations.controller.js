const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/audit');
const { mapLocation, resolveStoreId } = require('./_helpers');

const SELECT = `
  SELECT l.*, s.name AS store_name, p.name AS parent_name
  FROM locations l
  JOIN stores s ON s.id = l.store_id
  LEFT JOIN locations p ON p.id = l.parent_id
`;

const list = asyncHandler(async (req, res) => {
    const { rows } = await query(`${SELECT} ORDER BY l.store_id, l.type, l.name`);
    res.json(rows.map(mapLocation));
});

const getOne = asyncHandler(async (req, res) => {
    const { rows } = await query(`${SELECT} WHERE l.id = $1`, [req.params.id]);
    if (!rows[0]) throw new AppError('Location not found.', 404);
    res.json(mapLocation(rows[0]));
});

const create = asyncHandler(async (req, res) => {
    const { storeId, store, parentId, type, code, name } = req.body;
    if ((!storeId && !store) || !type || !code || !name) {
        throw new AppError('store or storeId, type, code, and name are required.', 400);
    }
    const resolvedStoreId = storeId || await resolveStoreId(store);

    const { rows } = await query(
        `INSERT INTO locations (store_id, parent_id, type, code, name)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [resolvedStoreId, parentId || null, type, code, name]
    );

    await logAudit(query, {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: `Created location ${code}`,
        module: 'Locations',
        entityType: 'location',
        entityId: rows[0].id
    });

    const { rows: full } = await query(`${SELECT} WHERE l.id = $1`, [rows[0].id]);
    res.status(201).json(mapLocation(full[0]));
});

const update = asyncHandler(async (req, res) => {
    const { parentId, type, code, name, active } = req.body;
    const { rows } = await query(
        `UPDATE locations SET
       parent_id = COALESCE($1, parent_id), type = COALESCE($2, type),
       code = COALESCE($3, code), name = COALESCE($4, name),
       active = COALESCE($5, active), updated_at = NOW()
     WHERE id = $6 RETURNING id`,
        [parentId, type, code, name, active, req.params.id]
    );
    if (!rows[0]) throw new AppError('Location not found.', 404);

    await logAudit(query, {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: `Updated location ${req.params.id}`,
        module: 'Locations',
        entityType: 'location',
        entityId: rows[0].id
    });

    const { rows: full } = await query(`${SELECT} WHERE l.id = $1`, [rows[0].id]);
    res.json(mapLocation(full[0]));
});

module.exports = { list, getOne, create, update };