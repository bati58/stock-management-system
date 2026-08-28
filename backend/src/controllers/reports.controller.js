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

  if (role === ROLES.ADMIN) {
    const overviewQ = await query(`
      SELECT
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM users WHERE active = TRUE) AS active_users,
        (SELECT COUNT(*) FROM users WHERE active = FALSE) AS inactive_users,
        (SELECT COUNT(DISTINCT role) FROM users) AS total_roles,
        (SELECT COUNT(*) FROM departments) AS total_departments,
        (SELECT COUNT(*) FROM stores) AS total_stores,
        (SELECT COUNT(*) FROM items) AS total_items,
        (SELECT COUNT(*) FROM suppliers) AS total_suppliers
    `);
    const overview = overviewQ.rows[0];
    summary.systemOverview = {
      totalUsers: Number(overview.total_users),
      activeUsers: Number(overview.active_users),
      inactiveUsers: Number(overview.inactive_users),
      totalRoles: Number(overview.total_roles),
      totalDepartments: Number(overview.total_departments),
      totalStores: Number(overview.total_stores),
      totalItems: Number(overview.total_items),
      totalSuppliers: Number(overview.total_suppliers)
    };
  }

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

// GET /api/reports/issue-status
const issueStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT iv.siv_ref, iv.type, iv.sr_ref, iv.issued_to, iv.issued_by, iv.date, iv.status
    FROM issue_vouchers iv ORDER BY iv.date DESC
  `);
  res.json(rows.map((r) => ({
    sivRef: r.siv_ref, type: r.type, srRef: r.sr_ref, issuedTo: r.issued_to,
    issuedBy: r.issued_by, date: r.date, status: r.status
  })));
});

// GET /api/reports/return-status
const returnStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT mr.srn_ref, mr.department, i.name AS item, mr.qty, mr.status, mr.date
    FROM material_returns mr LEFT JOIN items i ON i.id = mr.item_id
    ORDER BY mr.date DESC
  `);
  res.json(rows.map((r) => ({
    srnRef: r.srn_ref, department: r.department, item: r.item,
    qty: Number(r.qty), status: r.status, date: r.date
  })));
});

// GET /api/reports/transfer-status
const transferStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT mt.transfer_ref, fs.name AS from_store, ts.name AS to_store,
           i.name AS item, mt.qty, mt.status, mt.date
    FROM material_transfers mt
    LEFT JOIN stores fs ON fs.id = mt.from_store_id
    LEFT JOIN stores ts ON ts.id = mt.to_store_id
    LEFT JOIN items i ON i.id = mt.item_id
    ORDER BY mt.date DESC
  `);
  res.json(rows.map((r) => ({
    transferRef: r.transfer_ref, fromStore: r.from_store, toStore: r.to_store,
    item: r.item, qty: Number(r.qty), status: r.status, date: r.date
  })));
});

// GET /api/reports/asset-summary
const assetSummary = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT fa.asset_tag, fa.name, fa.category, s.name AS store, fa.assigned_to,
           fa.status, fa.acquisition_date, fa.value
    FROM fixed_assets fa LEFT JOIN stores s ON s.id = fa.store_id
    ORDER BY fa.acquisition_date DESC
  `);
  res.json(rows.map((r) => ({
    assetTag: r.asset_tag, name: r.name, category: r.category, store: r.store,
    assignedTo: r.assigned_to, status: r.status, acquisitionDate: r.acquisition_date,
    value: Number(r.value)
  })));
});

// GET /api/reports/disposal-status
const disposalStatus = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT d.disposal_ref, i.name AS item, s.name AS store, d.qty, d.reason,
           d.date_flagged, d.status
    FROM disposals d
    LEFT JOIN items i ON i.id = d.item_id
    LEFT JOIN stores s ON s.id = i.store_id
    ORDER BY d.date_flagged DESC
  `);
  res.json(rows.map((r) => ({
    disposalRef: r.disposal_ref, item: r.item, store: r.store,
    qty: Number(r.qty), reason: r.reason, dateFlagged: r.date_flagged, status: r.status
  })));
});

// GET /api/reports/fifo-valuation
const fifoValuation = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT i.code, i.name, i.unit, sl.unit_price, sl.qty_remaining,
           (sl.unit_price * sl.qty_remaining) AS lot_value,
           sl.received_date, sl.source_ref
    FROM stock_lots sl
    JOIN items i ON i.id = sl.item_id
    WHERE sl.qty_remaining > 0
    ORDER BY i.name, sl.received_date ASC
  `);
  res.json(rows.map((r) => ({
    code: r.code, name: r.name, unit: r.unit, unitPrice: Number(r.unit_price),
    qtyRemaining: Number(r.qty_remaining), lotValue: Number(r.lot_value),
    receivedDate: r.received_date, sourceRef: r.source_ref
  })));
});

// ---------------------------------------------------------------------------
// Generic CSV export — GET /api/reports/export-csv?report=<reportName>
// Calls the matching report handler internally and converts the JSON array
// into a downloadable CSV file.
// ---------------------------------------------------------------------------
function jsonToCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    if (val == null) return '';
    const str = String(val);
    return str.includes(',') || str.includes('"') || str.includes('\n')
      ? `"${str.replace(/"/g, '""')}"`
      : str;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

const REPORT_HANDLERS = {
  'inventory-summary': inventorySummary,
  'low-stock': lowStock,
  'stock-movement': stockMovement,
  'grn-status': grnStatus,
  'requisition-status': requisitionStatus,
  'issue-status': issueStatus,
  'return-status': returnStatus,
  'transfer-status': transferStatus,
  'asset-summary': assetSummary,
  'disposal-status': disposalStatus,
  'fifo-valuation': fifoValuation
};

const exportCsv = asyncHandler(async (req, res) => {
  const reportName = req.query.report;
  if (!reportName || !REPORT_HANDLERS[reportName]) {
    return res.status(400).json({ message: `Unknown report: "${reportName}". Available: ${Object.keys(REPORT_HANDLERS).join(', ')}` });
  }

  // Capture the JSON output by shimming res.json
  let capturedData;
  const fakeRes = {
    json: (data) => { capturedData = data; },
    status: () => fakeRes
  };
  await REPORT_HANDLERS[reportName](req, fakeRes, () => { });

  const csv = jsonToCsv(Array.isArray(capturedData) ? capturedData : [capturedData]);
  const filename = `${reportName}_${new Date().toISOString().slice(0, 10)}.csv`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
});

module.exports = {
  inventorySummary, lowStock, stockMovement, grnStatus, requisitionStatus,
  dashboardSummary, issueStatus, returnStatus, transferStatus, assetSummary,
  disposalStatus, fifoValuation, exportCsv
};
