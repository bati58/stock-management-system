const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

// POST /api/auth/login — Backend-SRS §3.2
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw new AppError('Username and password are required.', 400);
  }

  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username.trim()]);
  const user = rows[0];

  if (!user) {
    throw new AppError('Invalid username or password.', 401);
  }
  if (!user.active) {
    throw new AppError('This account has been deactivated.', 403);
  }

  const passwordOk = await bcrypt.compare(password, user.password_hash);
  if (!passwordOk) {
    throw new AppError('Invalid username or password.', 401);
  }

  const token = jwt.sign(
    { id: user.id, role: user.role, name: user.name, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role,
      email: user.email,
      phone: user.phone,
      department: user.department,
      active: user.active
    }
  });
});

// GET /api/auth/me — convenience endpoint so the frontend can re-hydrate
// the session on page load using only the stored token.
const me = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT id, name, username, role, email, phone, department, active FROM users WHERE id = $1', [
    req.user.id
  ]);
  if (!rows[0]) throw new AppError('User not found.', 404);
  res.json(rows[0]);
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    throw new AppError('Current password and a new password of at least 8 characters are required.', 400);
  }
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    throw new AppError('Current password is incorrect.', 400);
  }
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [passwordHash, req.user.id]);
  res.json({ message: 'Password changed successfully.' });
});

module.exports = { login, me, changePassword };
