const { query, withTransaction } = require('../config/db');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { mapIssueVoucher } = require('./_helpers');
const stockService = require('../services/stockService');

const SELECT = 'SELECT * FROM issue_vouchers';

async function fetchWithLines(id, dbClient = { query }) {
  const { rows } = await dbClient.query(`${SELECT} WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  const { rows: lines } = await dbClient.query(
    `SELECT ivi.*, i.name AS item_name FROM issue_voucher_items ivi JOIN items i ON i.id = ivi.item_id WHERE ivi.issue_voucher_id = $1`,
    [id]
  );
  return mapIssueVoucher(rows[0], lines);
}

const list = asyncHandler(async (req, res) => {
  const { rows } = await query(`${SELECT} ORDER BY id DESC`);
  const results = [];
  for (const row of rows) {
    const { rows: lines } = await query(
      `SELECT ivi.*, i.name AS item_name FROM issue_voucher_items ivi JOIN items i ON i.id = ivi.item_id WHERE ivi.issue_voucher_id = $1`,
      [row.id]
    );
    results.push(mapIssueVoucher(row, lines));
  }
  res.json(results);
});

const getOne = asyncHandler(async (req, res) => {
  const v = await fetchWithLines(req.params.id);
  if (!v) throw new AppError('Issue voucher not found.', 404);
  res.json(v);
});

// POST /api/issue-vouchers — Backend-SRS §6.2 steps 3-4 (generates from an
// approved requisition; decrements stock via FIFO)
const create = asyncHandler(async (req, res) => {
  const { srRef } = req.body;
  if (!srRef) throw new AppError('srRef (the approved requisition reference) is required.', 400);

  const result = await withTransaction(async (client) => {
    const { id } = await stockService.createPreliminaryIssueVoucher(client, {
      srRef,
      issuedBy: req.user.name,
      actorName: req.user.name
    });
    return fetchWithLines(id, client);
  });

  res.status(201).json(result);
});

const approve = asyncHandler(async (req, res) => {
  await withTransaction((client) => stockService.approveIssueVoucher(client, { voucherId: req.params.id, actorName: req.user.name }));
  res.json(await fetchWithLines(req.params.id));
});

const post = asyncHandler(async (req, res) => {
  await withTransaction((client) => stockService.postIssueVoucher(client, { voucherId: req.params.id, actorName: req.user.name }));
  res.json(await fetchWithLines(req.params.id));
});

const amend = asyncHandler(async (req, res) => {
  await withTransaction((client) => stockService.amendIssueVoucher(client, { voucherId: req.params.id, items: req.body.items, reason: req.body.reason, actorName: req.user.name }));
  res.json(await fetchWithLines(req.params.id));
});

module.exports = { list, getOne, create, approve, amend, post };
