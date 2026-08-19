const { query } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const { ROLES } = require('../utils/permissions');

// GET /api/reports/inventory-summary
const inventorySummary = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT i.code, i.name, s.name AS store, i.qty_on_hand, i.unit_price,
           (i.qty_on_hand * i.unit_price) AS value
    FROM items i JOIN stores s ON s.id = i.store_id
    ORDER BY i.name
  `);
  res.json(
    rows.map((r) => ({
      code: r.code,
      name: r.name,
      store: r.store,
      qtyOnHand: Number(r.qty_on_hand),
      unitPrice: Number(r.unit_price),
      value: Number(r.value)
    }))
  );
});

// GET /api/reports/low-stock
const lowStock = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT i.code, i.name, s.name AS store, i.qty_on_hand, i.reorder_level
    FROM items i JOIN stores s ON s.id = i.store_id
    WHERE i.qty_on_hand <= i.reorder_level
    ORDER BY i.name
  `);
  res.json(
    rows.map((r) => ({
      code: r.code,
      name: r.name,
      store: r.store,
      qtyOnHand: Number(r.qty_on_hand),
      reorderLevel: Number(r.reorder_level)
    }))
  );
});

// GET /api/reports/stock-movement?from=&to=&item=
const stockMovement = asyncHandler(async (req, res) => {
  const { from, to, item } = req.query;
  const conditions = [];
  const params = [];

  if (from) {
    params.push(from);
    conditions.push(`st.date >= $${params.length}`);
  }
  if (to) {
    params.push(to);
    conditions.push(`st.date <= $${params.length}`);
  }
  if (item) {
    params.push(item);
    conditions.push(`i.name = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    `SELECT st.date, i.name AS item, st.type, st.ref, st.qty_in, st.qty_out, st.balance
     FROM stock_transactions st JOIN items i ON i.id = st.item_id
     ${where}
     ORDER BY st.date DESC, st.id DESC`,
    params
  );
  res.json(
    rows.map((r) => ({
      date: r.date,
      item: r.item,
      type: r.type,
      ref: r.ref,
      qtyIn: Number(r.qty_in),
      qtyOut: Number(r.qty_out),
      balance: Number(r.balance)
    }))
  );
});

// GET /api/reports/grn-status
const grnStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT g.grn_ref, g.supplier, s.name AS store, g.received_date, g.status
    FROM goods_receipts g JOIN stores s ON s.id = g.store_id
    ORDER BY g.received_date DESC
  `);
  res.json(
    rows.map((r) => ({ grnRef: r.grn_ref, supplier: r.supplier, store: r.store, receivedDate: r.received_date, status: r.status }))
  );
});

// GET /api/reports/requisition-status
const requisitionStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT sr_ref, department, date, status FROM requisitions ORDER BY date DESC
  `);
  res.json(rows.map((r) => ({ srRef: r.sr_ref, department: r.department, date: r.date, status: r.status })));
});

// GET /api/reports/dashboard-summary — role-aware aggregate counts for the
// per-role dashboards. Computes server-side so a Department Head's browser
// never receives other departments' raw data (Backend-SRS §7).
const dashboardSummary = asyncHandler(async (req, res) => {
  const role = req.user.role;
  const summary = {};

  const totalValueQ = await query('SELECT COALESCE(SUM(qty_on_hand * unit_price), 0) AS total FROM items');
  summary.totalInventoryValue = Number(totalValueQ.rows[0].total);

  const lowStockQ = await query('SELECT COUNT(*) AS count FROM items WHERE qty_on_hand <= reorder_level');
  summary.itemsAtReorderLevel = Number(lowStockQ.rows[0].count);

  const pendingGrnQ = await query(
    "SELECT COUNT(*) AS count FROM goods_receipts WHERE status IN ('Pending','Under Evaluation')"
  );
  summary.pendingGoodsReceipts = Number(pendingGrnQ.rows[0].count);

  if (role === ROLES.DEPT_HEAD) {
    const mine = await query('SELECT COUNT(*) AS count FROM requisitions WHERE requested_by = $1 AND status = $2', [
      req.user.name,
      'Pending'
    ]);
    summary.pendingRequisitions = Number(mine.rows[0].count);
    const myReturns = await query(
      `SELECT COUNT(*) AS count FROM material_returns mr
       JOIN requisitions r ON r.department = mr.department
       WHERE mr.status = 'Pending'`
    );
    summary.pendingReturns = Number(myReturns.rows[0].count);
  } else {
    const pendingReqQ = await query("SELECT COUNT(*) AS count FROM requisitions WHERE status = 'Pending'");
    summary.pendingRequisitions = Number(pendingReqQ.rows[0].count);
  }

  if (role === ROLES.TEC) {
    const pendingReturnsQ = await query("SELECT COUNT(*) AS count FROM material_returns WHERE status = 'Pending'");
    summary.pendingReturnEvaluations = Number(pendingReturnsQ.rows[0].count);
  }

  if (role === ROLES.PAO || role === ROLES.ADMIN) {
    const pendingTransfersQ = await query("SELECT COUNT(*) AS count FROM material_transfers WHERE status = 'Pending'");
    summary.pendingTransfers = Number(pendingTransfersQ.rows[0].count);
    const pendingDisposalsQ = await query("SELECT COUNT(*) AS count FROM disposals WHERE status = 'Pending'");
    summary.pendingDisposals = Number(pendingDisposalsQ.rows[0].count);
  }

  res.json(summary);
});

module.exports = { inventorySummary, lowStock, stockMovement, grnStatus, requisitionStatus, dashboardSummary };
