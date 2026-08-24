const AppError = require('./AppError');

const TRANSITIONS = {
    goodsReceipt: {
        Draft: ['Submitted', 'Pending'],
        Submitted: ['Pending Evaluation', 'Under Evaluation'],
        Pending: ['Pending Evaluation', 'Under Evaluation'],
        'Pending Evaluation': ['Under Evaluation'],
        'Under Evaluation': ['Accepted', 'Partially Accepted', 'Rejected', 'GRN Generated']
    },
    requisition: {
        Draft: ['Submitted', 'Pending', 'Approved', 'Partially Approved', 'Rejected'],
        Submitted: ['Pending Approval', 'Approved', 'Partially Approved', 'Rejected'],
        Pending: ['Approved', 'Partially Approved', 'Rejected'],
        'Pending Approval': ['Approved', 'Partially Approved', 'Rejected']
    },
    materialReturn: {
        Draft: ['Submitted', 'Pending Review', 'Approved', 'Rejected'],
        Submitted: ['Pending Review', 'Approved', 'Rejected'],
        Pending: ['Approved', 'Rejected'],
        'Pending Review': ['Approved', 'Rejected']
    },
    materialTransfer: {
        Draft: ['Submitted', 'Pending', 'Pending Approval', 'Approved', 'Rejected'],
        Submitted: ['Pending Approval', 'Approved', 'Rejected'],
        Pending: ['Pending Approval', 'Approved', 'Rejected'],
        'Pending Approval': ['Approved', 'Rejected'],
        Approved: ['Dispatched'],
        Dispatched: ['Received']
    },
    disposal: {
        Flagged: ['Requested', 'Pending Review', 'Approved', 'Rejected'],
        Requested: ['Pending Review', 'Approved', 'Rejected'],
        Pending: ['Pending Review', 'Approved', 'Rejected'],
        'Pending Review': ['Approved', 'Rejected'],
        Approved: ['Executed']
    },
    issueVoucher: {
        Preliminary: ['Pending Approval', 'Approved'],
        'Pending Approval': ['Approved', 'Rejected'],
        Approved: ['Posted']
    }
};

function assertTransition(workflow, currentStatus, nextStatus) {
    const allowed = TRANSITIONS[workflow]?.[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
        throw new AppError(
            `Invalid ${workflow} transition from "${currentStatus}" to "${nextStatus}".`,
            409
        );
    }
}

module.exports = { TRANSITIONS, assertTransition };