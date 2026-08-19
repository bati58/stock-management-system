const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/audit');
const { mapUser } = require('./_helpers');

const list = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users ORDER BY id');
  res.json(rows.map(mapUser));
});

const getOne = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new AppError('User not found.', 404);
  res.json(mapUser(rows[0]));
});

const create = asyncHandler(async (req, res) => {
  const { name, username, email, phone, role, department, password } = req.body;
  if (!name || !username || !role) {
    throw new AppError('name, username, and role are required.', 400);
  }
  const passwordHash = await bcrypt.hash(password || 'sms1234', 10);

  const { rows } = await query(
    `INSERT INTO users (name, username, password_hash, role, email, phone, department, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE) RETURNING *`,
    [name, username, passwordHash, role, email || null, phone || null, department || null]
  );

  await logAudit(query, {
    userName: req.user.name,
    action: `Created user account for ${name}`,
    module: 'User Management'
  });

  res.status(201).json(mapUser(rows[0]));
});

const update = asyncHandler(async (req, res) => {
  const { name, username, email, phone, role, department, active, password } = req.body;
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;

  const { rows } = await query(
    `UPDATE users SET
       name = COALESCE($1, name),
       username = COALESCE($2, username),
       email = COALESCE($3, email),
       phone = COALESCE($4, phone),
       role = COALESCE($5, role),
       department = COALESCE($6, department),
       active = COALESCE($7, active),
       password_hash = COALESCE($8, password_hash),
       updated_at = NOW()
     WHERE id = $9 RETURNING *`,
    [name, username, email, phone, role, department, active, passwordHash, req.params.id]
  );
  if (!rows[0]) throw new AppError('User not found.', 404);

  await logAudit(query, { userName: req.user.name, action: `Updated user ${rows[0].name}`, module: 'User Management' });

  res.json(mapUser(rows[0]));
});

const remove = asyncHandler(async (req, res) => {
  const { rows } = await query('DELETE FROM users WHERE id = $1 RETURNING name', [req.params.id]);
  if (!rows[0]) throw new AppError('User not found.', 404);

  await logAudit(query, { userName: req.user.name, action: `Deleted user ${rows[0].name}`, module: 'User Management' });

  res.status(204).send();
});

module.exports = { list, getOne, create, update, remove };
