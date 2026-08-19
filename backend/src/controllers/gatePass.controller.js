const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/audit');

const TABLES = {
    'goods-receipts': { table: 'goods_receipts', ref: 'grn_ref' },
    'issue-vouchers': { table: 'issue_vouchers', ref: 'siv_ref' },
    'material-transfers': { table: 'material_transfers', ref: 'transfer_ref' }
};

const verify = asyncHandler(async (req, res) => {
    const target = TABLES[req.params.resource];
    if (!target) throw new AppError('Unsupported gate-pass document.', 404);

    const { rows } = await query(
        `UPDATE ${target.table}
     SET gate_verified = TRUE, gate_verified_by = $1, gate_verified_at = NOW(), updated_at = NOW()
     WHERE id = $2
     RETURNING id, ${target.ref} AS reference, gate_verified, gate_verified_by, gate_verified_at`,
        [req.user.name, req.params.id]
    );
    if (!rows[0]) throw new AppError('Gate-pass document not found.', 404);

    await logAudit(query, {
        userId: req.user.id,
        userName: req.user.name,
        userRole: req.user.role,
        action: `Verified gate pass ${rows[0].reference}`,
        module: 'Gate Pass',
        entityId: rows[0].id,
        entityReference: rows[0].reference,
        description: `${req.user.name} verified ${rows[0].reference} at the gate.`,
        metadata: { resource: req.params.resource }
    });

    res.json(rows[0]);
});

module.exports = { verify };
