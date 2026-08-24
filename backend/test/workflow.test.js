const test = require('node:test');
const assert = require('node:assert/strict');
const { assertTransition } = require('../src/utils/workflow');

test('allows a receipt to move into technical evaluation', () => {
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Pending', 'Under Evaluation'));
});

test('rejects a receipt that is already posted', () => {
    assert.throws(
        () => assertTransition('goodsReceipt', 'GRN Generated', 'Rejected'),
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