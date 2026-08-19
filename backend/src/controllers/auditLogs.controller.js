const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { mapAuditLog } = require('./_helpers');

// Read-only — every row is inserted by logAudit() as a side effect of
// another action (Backend-SRS §6.10). No create/update/delete endpoint
// exists or should exist here.
const list = asyncHandler(async (req, res) => {
  const { rows } = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 500');
  res.json(rows.map(mapAuditLog));
});

module.exports = { list };
