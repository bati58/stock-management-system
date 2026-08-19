const AppError = require('../utils/AppError');
const { logAudit } = require('../utils/audit');

// =============================================================================
// This file is the implementation of Backend-SRS.docx Section 6. Every
// function here MUST be called with a transaction client (from
// config/db.js's withTransaction) so a failure partway through never
// leaves items.qty_on_hand, stock_transactions, and bin_cards inconsistent
// with each other.
// =============================================================================

// ---------------------------------------------------------------------------
// §6.6 FIFO valuation
// ---------------------------------------------------------------------------

// Adds a new stock lot (a receipt or a return) for FIFO consumption later.
async function addStockLot(client, { itemId, receivedDate, unitPrice, qty, sourceRef }) {
  await client.query(
    `INSERT INTO stock_lots (item_id, received_date, unit_price, qty_received, qty_remaining, source_ref)
     VALUES ($1, $2, $3, $4, $4, $5)`,
    [itemId, receivedDate, unitPrice, qty, sourceRef]
  );
}

// Consumes `qty` from the oldest available lots first (FIFO). Returns the
// weighted average unit price of what was actually consumed, for recording
// on the stock_transactions row. Throws if there isn't enough stock.
async function consumeFifo(client, itemId, qty) {
  const { rows: lots } = await client.query(
    `SELECT id, unit_price, qty_remaining
     FROM stock_lots
     WHERE item_id = $1 AND qty_remaining > 0
     ORDER BY received_date ASC, id ASC
     FOR UPDATE`,
    [itemId]
  );

  let remainingToConsume = Number(qty);
  let totalCost = 0;
  let totalConsumed = 0;

  for (const lot of lots) {
    if (remainingToConsume <= 0) break;
    const take = Math.min(Number(lot.qty_remaining), remainingToConsume);
    await client.query('UPDATE stock_lots SET qty_remaining = qty_remaining - $1 WHERE id = $2', [
      take,
      lot.id
    ]);
    totalCost += take * Number(lot.unit_price);
    totalConsumed += take;
    remainingToConsume -= take;
  }

  if (remainingToConsume > 0.0001) {
    throw new AppError(
      `Insufficient stock to fulfil this request: short by ${remainingToConsume} unit(s).`,
      400
    );
  }

  return totalConsumed > 0 ? totalCost / totalConsumed : 0;
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getItemForUpdate(client, itemId) {
  const { rows } = await client.query('SELECT * FROM items WHERE id = $1 FOR UPDATE', [itemId]);
  if (!rows[0]) throw new AppError(`Item ${itemId} not found.`, 404);
  return rows[0];
}

async function insertStockTransaction(client, { itemId, date, type, ref, qtyIn = 0, qtyOut = 0, unitPrice, balance }) {
  await client.query(
    `INSERT INTO stock_transactions (item_id, date, type, ref, qty_in, qty_out, unit_price, balance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [itemId, date, type, ref, qtyIn, qtyOut, unitPrice, balance]
  );
}

async function upsertBinCard(client, { bin, storeId, itemId, delta, date }) {
  if (!bin) return; // some items may not have a bin assigned yet
  const { rows } = await client.query(
    `INSERT INTO bin_cards (bin, store_id, item_id, last_movement, balance)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (bin, store_id, item_id)
     DO UPDATE SET balance = bin_cards.balance + $5, last_movement = $4
     RETURNING balance`,
    [bin, storeId, itemId, date, delta]
  );
  if (rows[0] && Number(rows[0].balance) < 0) {
    throw new AppError('This movement would take a bin card balance negative.', 400);
  }
}

// ---------------------------------------------------------------------------
// §6.1 Goods Receipt approval -> stock increases
// ---------------------------------------------------------------------------

async function approveGoodsReceipt(client, { grnId, evaluationNote, evaluatedBy, actorName }) {
  const { rows: grnRows } = await client.query('SELECT * FROM goods_receipts WHERE id = $1 FOR UPDATE', [grnId]);
  const grn = grnRows[0];
  if (!grn) throw new AppError('Goods receipt not found.', 404);
  if (['Accepted', 'Approved', 'Rejected', 'GRN Generated'].includes(grn.status)) {
    throw new AppError(`This goods receipt is already ${grn.status.toLowerCase()}.`, 409);
  }

  const { rows: lines } = await client.query('SELECT * FROM goods_receipt_items WHERE goods_receipt_id = $1', [grnId]);

  for (const line of lines) {
    const item = await getItemForUpdate(client, line.item_id);
    const newQty = Number(item.qty_on_hand) + Number(line.qty);

    await client.query('UPDATE items SET qty_on_hand = $1, unit_price = $2, updated_at = NOW() WHERE id = $3', [
      newQty,
      line.unit_price,
      item.id
    ]);

    await addStockLot(client, {
      itemId: item.id,
      receivedDate: grn.received_date,
      unitPrice: line.unit_price,
      qty: line.qty,
      sourceRef: grn.grn_ref
    });

    await insertStockTransaction(client, {
      itemId: item.id,
      date: grn.received_date,
      type: 'Receipt',
      ref: grn.grn_ref,
      qtyIn: line.qty,
      unitPrice: line.unit_price,
      balance: newQty
    });

    await upsertBinCard(client, {
      bin: item.bin,
      storeId: item.store_id,
      itemId: item.id,
      delta: Number(line.qty),
      date: grn.received_date
    });
  }

  await client.query(
    `UPDATE goods_receipts SET status = 'GRN Generated', evaluation_note = $1, evaluated_by = $2, updated_at = NOW() WHERE id = $3`,
    [evaluationNote, evaluatedBy, grnId]
  );

  await logAudit(client, {
    userName: actorName,
    action: `Approved evaluation for ${grn.grn_ref}`,
    module: 'Technical Evaluation'
  });
}

async function rejectGoodsReceipt(client, { grnId, evaluationNote, evaluatedBy, actorName }) {
  const { rows } = await client.query('SELECT * FROM goods_receipts WHERE id = $1 FOR UPDATE', [grnId]);
  const grn = rows[0];
  if (!grn) throw new AppError('Goods receipt not found.', 404);
  if (['Accepted', 'Approved', 'Rejected', 'GRN Generated'].includes(grn.status)) {
    throw new AppError(`This goods receipt is already ${grn.status.toLowerCase()}.`, 409);
  }

  // §6.1 step 4 — no stock quantity changes on rejection; goods were never
  // accepted into store, per MoFED manual §3.4.
  await client.query(
    `UPDATE goods_receipts SET status = 'Rejected', evaluation_note = $1, evaluated_by = $2, updated_at = NOW() WHERE id = $3`,
    [evaluationNote, evaluatedBy, grnId]
  );

  await logAudit(client, {
    userName: actorName,
    action: `Rejected evaluation for ${grn.grn_ref}`,
    module: 'Technical Evaluation'
  });
}

// ---------------------------------------------------------------------------
// §6.2 Requisition approval (no stock change) + Issue Voucher (stock decreases)
// ---------------------------------------------------------------------------

async function decideRequisition(client, { requisitionId, decision, items = [], actorName }) {
  const { rows } = await client.query('SELECT * FROM requisitions WHERE id = $1 FOR UPDATE', [requisitionId]);
  const req = rows[0];
  if (!req) throw new AppError('Requisition not found.', 404);
  if (!['Draft', 'Pending', 'Submitted', 'Pending Approval'].includes(req.status)) {
    throw new AppError(`This requisition is already ${req.status.toLowerCase()}.`, 409);
  }

  await client.query('UPDATE requisitions SET status = $1, updated_at = NOW() WHERE id = $2', [decision, requisitionId]);
  for (const line of items) {
    await client.query(
      `UPDATE requisition_items ri SET qty_approved = $1
       FROM items i WHERE ri.requisition_id = $2 AND ri.item_id = i.id AND i.name = $3`,
      [line.qtyApproved == null ? line.qty : line.qtyApproved, requisitionId, line.item]
    );
  }

  await logAudit(client, {
    userName: actorName,
    action: `${decision} requisition ${req.sr_ref}`,
    module: 'Store Requisition'
  });
}

async function createIssueVoucherFromRequisition(client, { srRef, issuedBy, actorName }) {
  const { rows: reqRows } = await client.query('SELECT * FROM requisitions WHERE sr_ref = $1 FOR UPDATE', [srRef]);
  const requisition = reqRows[0];
  if (!requisition) throw new AppError('Requisition not found.', 404);
  if (requisition.status !== 'Approved') {
    throw new AppError('Only an approved requisition can be issued.', 400);
  }

  const { rows: lines } = await client.query(
    'SELECT ri.*, i.bin, i.store_id FROM requisition_items ri JOIN items i ON i.id = ri.item_id WHERE ri.requisition_id = $1',
    [requisition.id]
  );
  if (lines.length === 0) throw new AppError('This requisition has no line items.', 400);

  const { nextRef } = require('../utils/refGenerator');
  const sivRef = await nextRef(client, 'SIV');

  // §6.2 step 4 — ISIV if the requesting department name matches a store name.
  const { rows: storeMatch } = await client.query('SELECT id FROM stores WHERE name = $1', [requisition.department]);
  const type = storeMatch.length > 0 ? 'ISIV' : 'SIV';

  const { rows: sivRows } = await client.query(
    `INSERT INTO issue_vouchers (siv_ref, type, sr_ref, issued_to, issued_by, date, status)
     VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, 'Issued') RETURNING id`,
    [sivRef, type, srRef, requisition.department, issuedBy]
  );
  const issueVoucherId = sivRows[0].id;

  for (const line of lines) {
    const item = await getItemForUpdate(client, line.item_id);
    const issueQty = line.qty_approved == null ? Number(line.qty) : Number(line.qty_approved);
    if (issueQty <= 0) continue;
    if (Number(item.qty_on_hand) < issueQty) {
      throw new AppError(`Not enough stock of "${item.name}" to issue ${issueQty} ${item.unit}(s).`, 400);
    }

    const fifoUnitPrice = await consumeFifo(client, item.id, issueQty);
    const newQty = Number(item.qty_on_hand) - issueQty;

    await client.query('UPDATE items SET qty_on_hand = $1, updated_at = NOW() WHERE id = $2', [newQty, item.id]);

    await client.query(
      'INSERT INTO issue_voucher_items (issue_voucher_id, item_id, qty, unit_price) VALUES ($1, $2, $3, $4)',
      [issueVoucherId, item.id, issueQty, fifoUnitPrice]
    );

    await insertStockTransaction(client, {
      itemId: item.id,
      date: new Date(),
      type: 'Issue',
      ref: sivRef,
      qtyOut: issueQty,
      unitPrice: fifoUnitPrice,
      balance: newQty
    });

    await upsertBinCard(client, {
      bin: item.bin,
      storeId: item.store_id,
      itemId: item.id,
      delta: -issueQty,
      date: new Date()
    });
  }

  await logAudit(client, { userName: actorName, action: `Issued ${sivRef}`, module: 'Issue Voucher' });

  return { id: issueVoucherId, sivRef };
}

// ---------------------------------------------------------------------------
// §6.3 Material Return approval -> stock increases
// ---------------------------------------------------------------------------

async function decideMaterialReturn(client, { returnId, decision, actorName }) {
  const { rows } = await client.query('SELECT * FROM material_returns WHERE id = $1 FOR UPDATE', [returnId]);
  const ret = rows[0];
  if (!ret) throw new AppError('Material return not found.', 404);
  if (!['Draft', 'Submitted', 'Pending', 'Pending Review'].includes(ret.status)) {
    throw new AppError(`This return is already ${ret.status.toLowerCase()}.`, 409);
  }

  if (decision === 'Approved') {
    const item = await getItemForUpdate(client, ret.item_id);
    const newQty = Number(item.qty_on_hand) + Number(ret.qty);

    await client.query('UPDATE items SET qty_on_hand = $1, updated_at = NOW() WHERE id = $2', [newQty, item.id]);

    await addStockLot(client, {
      itemId: item.id,
      receivedDate: ret.date,
      unitPrice: item.unit_price, // returns re-enter stock at the item's current cost
      qty: ret.qty,
      sourceRef: ret.srn_ref
    });

    await insertStockTransaction(client, {
      itemId: item.id,
      date: ret.date,
      type: 'Return',
      ref: ret.srn_ref,
      qtyIn: ret.qty,
      unitPrice: item.unit_price,
      balance: newQty
    });

    await upsertBinCard(client, {
      bin: item.bin,
      storeId: item.store_id,
      itemId: item.id,
      delta: Number(ret.qty),
      date: ret.date
    });
  }

  await client.query('UPDATE material_returns SET status = $1, updated_at = NOW() WHERE id = $2', [decision === 'Approved' ? 'Returned to Stock' : decision, returnId]);
  await logAudit(client, { userName: actorName, action: `${decision} return ${ret.srn_ref}`, module: 'Material Return' });
}

// ---------------------------------------------------------------------------
// §6.4 Material Transfer (store-to-store) approval -> dual stock update
// ---------------------------------------------------------------------------

async function decideMaterialTransfer(client, { transferId, decision, actorName }) {
  const { rows } = await client.query('SELECT * FROM material_transfers WHERE id = $1 FOR UPDATE', [transferId]);
  const transfer = rows[0];
  if (!transfer) throw new AppError('Material transfer not found.', 404);
  const validTransitions = {
    Approved: ['Draft', 'Submitted', 'Pending', 'Pending Approval'],
    Rejected: ['Draft', 'Submitted', 'Pending', 'Pending Approval'],
    Dispatched: ['Approved'],
    Received: ['Dispatched']
  };
  if (!validTransitions[decision]?.includes(transfer.status)) {
    throw new AppError(`This transfer is already ${transfer.status.toLowerCase()}.`, 409);
  }

  if (decision === 'Received') {
    const sourceItem = await getItemForUpdate(client, transfer.item_id);
    if (Number(sourceItem.qty_on_hand) < Number(transfer.qty)) {
      throw new AppError('Source store does not have enough stock for this transfer.', 400);
    }

    const fifoUnitPrice = await consumeFifo(client, sourceItem.id, transfer.qty);
    const newSourceQty = Number(sourceItem.qty_on_hand) - Number(transfer.qty);
    await client.query('UPDATE items SET qty_on_hand = $1, updated_at = NOW() WHERE id = $2', [newSourceQty, sourceItem.id]);

    await insertStockTransaction(client, {
      itemId: sourceItem.id,
      date: transfer.date,
      type: 'Transfer-Out',
      ref: transfer.transfer_ref,
      qtyOut: transfer.qty,
      unitPrice: fifoUnitPrice,
      balance: newSourceQty
    });
    await upsertBinCard(client, {
      bin: sourceItem.bin,
      storeId: sourceItem.store_id,
      itemId: sourceItem.id,
      delta: -Number(transfer.qty),
      date: transfer.date
    });

    // Find (or create) the matching item row in the destination store, by code.
    let { rows: destRows } = await client.query(
      'SELECT * FROM items WHERE code = $1 AND store_id = $2 FOR UPDATE',
      [sourceItem.code, transfer.to_store_id]
    );
    let destItem = destRows[0];

    if (!destItem) {
      const { rows: created } = await client.query(
        `INSERT INTO items (code, name, category_id, store_id, bin, unit, min_level, max_level, reorder_level, qty_on_hand, unit_price)
         VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8, 0, $9) RETURNING *`,
        [
          sourceItem.code, sourceItem.name, sourceItem.category_id, transfer.to_store_id,
          sourceItem.unit, sourceItem.min_level, sourceItem.max_level, sourceItem.reorder_level, fifoUnitPrice
        ]
      );
      destItem = created[0];
    }

    const newDestQty = Number(destItem.qty_on_hand) + Number(transfer.qty);
    await client.query('UPDATE items SET qty_on_hand = $1, unit_price = $2, updated_at = NOW() WHERE id = $3', [
      newDestQty,
      fifoUnitPrice,
      destItem.id
    ]);

    await addStockLot(client, {
      itemId: destItem.id,
      receivedDate: transfer.date,
      unitPrice: fifoUnitPrice,
      qty: transfer.qty,
      sourceRef: transfer.transfer_ref
    });

    await insertStockTransaction(client, {
      itemId: destItem.id,
      date: transfer.date,
      type: 'Transfer-In',
      ref: transfer.transfer_ref,
      qtyIn: transfer.qty,
      unitPrice: fifoUnitPrice,
      balance: newDestQty
    });
    await upsertBinCard(client, {
      bin: destItem.bin,
      storeId: destItem.store_id,
      itemId: destItem.id,
      delta: Number(transfer.qty),
      date: transfer.date
    });
  }

  const nextStatus = decision === 'Received' ? 'Completed' : decision;
  await client.query('UPDATE material_transfers SET status = $1, updated_at = NOW() WHERE id = $2', [nextStatus, transferId]);
  await logAudit(client, {
    userName: actorName,
    action: `${decision} transfer ${transfer.transfer_ref}`,
    module: 'Material Transfer'
  });
}

// ---------------------------------------------------------------------------
// §6.5 Bin Transfer (within one store) -> immediate bin_cards update
// ---------------------------------------------------------------------------

async function createBinTransfer(client, { itemId, fromBin, toBin, qty, transferredBy, actorName }) {
  const item = await getItemForUpdate(client, itemId);

  await upsertBinCard(client, { bin: fromBin, storeId: item.store_id, itemId: item.id, delta: -Number(qty), date: new Date() });
  await upsertBinCard(client, { bin: toBin, storeId: item.store_id, itemId: item.id, delta: Number(qty), date: new Date() });

  const { rows } = await client.query(
    `INSERT INTO bin_transfers (item_id, from_bin, to_bin, qty, date, transferred_by)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, $5) RETURNING *`,
    [itemId, fromBin, toBin, qty, transferredBy]
  );

  await logAudit(client, {
    userName: actorName,
    action: `Transferred ${qty} unit(s) of item ${item.code} from ${fromBin} to ${toBin}`,
    module: 'Stock Transfer'
  });

  return rows[0];
}

// ---------------------------------------------------------------------------
// §6.7 Disposal approval -> stock decreases
// ---------------------------------------------------------------------------

async function decideDisposal(client, { disposalId, decision, actorName }) {
  const { rows } = await client.query('SELECT * FROM disposals WHERE id = $1 FOR UPDATE', [disposalId]);
  const disposal = rows[0];
  if (!disposal) throw new AppError('Disposal request not found.', 404);
  if (!['Flagged', 'Requested', 'Pending', 'Pending Review'].includes(disposal.status)) {
    throw new AppError(`This disposal request is already ${disposal.status.toLowerCase()}.`, 409);
  }

  if (decision === 'Approved') {
    const item = await getItemForUpdate(client, disposal.item_id);
    if (Number(item.qty_on_hand) < Number(disposal.qty)) {
      throw new AppError('Not enough stock on hand to dispose of this quantity.', 400);
    }

    const fifoUnitPrice = await consumeFifo(client, item.id, disposal.qty);
    const newQty = Number(item.qty_on_hand) - Number(disposal.qty);
    await client.query('UPDATE items SET qty_on_hand = $1, updated_at = NOW() WHERE id = $2', [newQty, item.id]);

    await insertStockTransaction(client, {
      itemId: item.id,
      date: disposal.date_flagged,
      type: 'Disposal',
      ref: disposal.disposal_ref,
      qtyOut: disposal.qty,
      unitPrice: fifoUnitPrice,
      balance: newQty
    });

    await upsertBinCard(client, {
      bin: item.bin,
      storeId: item.store_id,
      itemId: item.id,
      delta: -Number(disposal.qty),
      date: disposal.date_flagged
    });
  }

  await client.query('UPDATE disposals SET status = $1, updated_at = NOW() WHERE id = $2', [decision === 'Approved' ? 'Executed' : decision, disposalId]);
  await logAudit(client, { userName: actorName, action: `${decision} disposal ${disposal.disposal_ref}`, module: 'Disposal Management' });
}

module.exports = {
  approveGoodsReceipt,
  rejectGoodsReceipt,
  decideRequisition,
  createIssueVoucherFromRequisition,
  decideMaterialReturn,
  decideMaterialTransfer,
  createBinTransfer,
  decideDisposal
};
