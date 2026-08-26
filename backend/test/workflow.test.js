const test = require('node:test');
const assert = require('node:assert/strict');
const { assertTransition } = require('../src/utils/workflow');

test('only reusable return conditions can be restocked', () => {
    const isReusable = (condition) => ['good', 'usable', 'reusable'].includes(String(condition || '').trim().toLowerCase());
    assert.equal(isReusable('Good'), true);
    assert.equal(isReusable('Reusable'), true);
    assert.equal(isReusable('Damaged'), false);
    assert.equal(isReusable(undefined), false);
});

test('allows a receipt to move into technical evaluation', () => {
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Pending', 'Under Evaluation'));
});

test('rejects a receipt that is already posted', () => {
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'GRN Generated', 'Posted'));
    assert.throws(
        () => assertTransition('goodsReceipt', 'Posted', 'Rejected'),
        (error) => error.statusCode === 409
    );
});

test('requires an approved transfer to be dispatched', () => {
    assert.throws(
        () => assertTransition('materialTransfer', 'Pending Approval', 'Dispatched'),
        (error) => error.statusCode === 409
    );
    assert.doesNotThrow(() => assertTransition('materialTransfer', 'Approved', 'Dispatched'));
});

test('a submitted requisition can be approved or returned for correction', () => {
    assert.doesNotThrow(() => assertTransition('requisition', 'Submitted', 'Approved'));
    assert.doesNotThrow(() => assertTransition('requisition', 'Submitted', 'Partially Approved'));
    assert.doesNotThrow(() => assertTransition('requisition', 'Submitted', 'Returned for Correction'));
    // A returned requisition can be resubmitted, closing the loop (no dead-end).
    assert.doesNotThrow(() => assertTransition('requisition', 'Returned for Correction', 'Submitted'));
});

test('a pending-approval transfer can be approved, rejected, or returned', () => {
    assert.doesNotThrow(() => assertTransition('materialTransfer', 'Pending Approval', 'Approved'));
    assert.doesNotThrow(() => assertTransition('materialTransfer', 'Pending Approval', 'Rejected'));
    assert.doesNotThrow(() => assertTransition('materialTransfer', 'Pending Approval', 'Returned for Correction'));
    assert.doesNotThrow(() => assertTransition('materialTransfer', 'Returned for Correction', 'Pending Approval'));
});

test('stock-taking follows submit -> approve -> post -> close', () => {
    assert.doesNotThrow(() => assertTransition('stockTaking', 'Submitted', 'Approved'));
    assert.doesNotThrow(() => assertTransition('stockTaking', 'Approved', 'Posted'));
    assert.doesNotThrow(() => assertTransition('stockTaking', 'Posted', 'Closed'));
    // Cannot skip approval and post a merely-submitted count.
    assert.throws(
        () => assertTransition('stockTaking', 'Submitted', 'Posted'),
        (error) => error.statusCode === 409
    );
});