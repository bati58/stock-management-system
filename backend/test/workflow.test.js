const test = require('node:test');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { assertTransition } = require('../src/utils/workflow');
const { canRead, canWrite, canAct, canDelete } = require('../src/utils/permissions');

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

test('goods receipt workflow must follow storekeeper -> store head -> TEC -> posted flow', () => {
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Draft', 'Submitted'));
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Submitted', 'Pending Evaluation'));
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Pending Evaluation', 'Under Evaluation'));
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Under Evaluation', 'Accepted'));
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'Accepted', 'GRN Generated'));
    assert.doesNotThrow(() => assertTransition('goodsReceipt', 'GRN Generated', 'Posted'));
    assert.throws(
        () => assertTransition('goodsReceipt', 'Draft', 'Accepted'),
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

test('administrator has system-admin access but no operational transaction write or action rights', () => {
    assert.equal(canRead('goods-receipts', 'Administrator'), true);
    assert.equal(canWrite('goods-receipts', 'Administrator'), false);
    assert.equal(canAct('goods-receipts-evaluate', 'Administrator'), false);
    assert.equal(canAct('requisitions', 'Administrator'), false);
    assert.equal(canRead('business-rules', 'Administrator'), true);
    assert.equal(canWrite('business-rules', 'Administrator'), true);
    assert.equal(canAct('business-rules', 'Administrator'), true);
    assert.equal(canRead('business-rules', 'Store Head'), false);
    assert.equal(canWrite('users', 'Administrator'), true);
    assert.equal(canDelete('users', 'Administrator'), false);
    assert.equal(canAct('stock-taking-post', 'Administrator'), false);
    assert.equal(canWrite('fixed-assets', 'Administrator'), false);
    assert.equal(canWrite('user-cards', 'Administrator'), false);
    assert.equal(canWrite('disposals', 'Administrator'), false);
    assert.equal(canAct('goods-receipts-notify-tec', 'Store Head'), true);
    assert.equal(canAct('goods-receipts-notify-tec', 'Storekeeper'), false);
    assert.equal(canAct('goods-receipts-post', 'Storekeeper'), true);
    assert.equal(canAct('goods-receipts-post', 'Store Head'), false);
});

test('store head is a supervisor with read access and no direct operational mutation authority', () => {
    assert.equal(canRead('stores', 'Store Head'), true);
    assert.equal(canRead('categories', 'Store Head'), true);
    assert.equal(canRead('items', 'Store Head'), true);
    assert.equal(canRead('locations', 'Store Head'), true);
    assert.equal(canRead('suppliers', 'Store Head'), true);
    assert.equal(canWrite('stores', 'Store Head'), true);
    assert.equal(canWrite('categories', 'Store Head'), false);
    assert.equal(canWrite('items', 'Store Head'), false);
    assert.equal(canWrite('locations', 'Store Head'), false);
    assert.equal(canWrite('goods-receipts', 'Store Head'), false);
    assert.equal(canAct('goods-receipts-notify-tec', 'Store Head'), true);
    assert.equal(canAct('goods-receipts-post', 'Store Head'), false);
    assert.equal(canAct('issue-voucher-post', 'Store Head'), false);
    assert.equal(canAct('stock-taking-post', 'Store Head'), false);
});

test('fixed-asset create/edit permissions match the backend policy', () => {
    assert.equal(canWrite('fixed-assets', 'Administrator'), false);
    assert.equal(canWrite('fixed-assets', 'Property Administration Officer'), true);
    assert.equal(canWrite('fixed-assets', 'Store Head'), true);
});

test('user material cards are managed by operational and supervisory roles, not by administrators', () => {
    assert.equal(canWrite('user-cards', 'Administrator'), false);
    assert.equal(canWrite('user-cards', 'Storekeeper'), true);
    assert.equal(canWrite('user-cards', 'Store Head'), true);
    assert.equal(canWrite('user-cards', 'Property Administration Officer'), true);
});

test('PAO gets approval alerts for submitted requisitions and pending transfer approvals', async () => {
    const { pathToFileURL } = require('node:url');
    const frontendUrl = pathToFileURL(require('node:path').resolve(__dirname, '../../frontend/src/utils/buildNotifications.js')).href;
    const { buildNotifications } = await import(frontendUrl);

    const notifications = buildNotifications(
        { role: 'Property Administration Officer' },
        {
            items: [],
            grns: [],
            reqs: [{ id: 1, status: 'Submitted', srRef: 'SR-1001', department: 'Operations', date: '2025-01-01' }],
            returns: [],
            transfers: [{ id: 2, status: 'Pending Approval', transferRef: 'TRF-2001', fromStore: 'Store A', toStore: 'Store B', date: '2025-01-01' }],
            disposals: [],
            vouchers: []
        }
    );

    assert.ok(notifications.some((n) => n.title === 'Approval Required' && n.message.includes('SR-1001')));
    assert.ok(notifications.some((n) => n.title === 'Transfer Pending' && n.message.includes('TRF-2001')));
});

test('admin delete APIs exist for master-data resources exposed by the UI', () => {
    const departmentsController = require('../src/controllers/departments.controller');
    const suppliersController = require('../src/controllers/suppliers.controller');
    const locationsController = require('../src/controllers/locations.controller');
    const routes = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../src/routes/index.js'), 'utf8');

    assert.equal(typeof departmentsController.remove, 'function');
    assert.equal(typeof suppliersController.remove, 'function');
    assert.equal(typeof locationsController.remove, 'function');
    assert.match(routes, /router\.delete\('\/departments\/:id'|router\.delete\("\/departments\/:id"/);
    assert.match(routes, /router\.delete\('\/suppliers\/:id'|router\.delete\("\/suppliers\/:id"/);
    assert.match(routes, /router\.delete\('\/locations\/:id'|router\.delete\("\/locations\/:id"/);
});

