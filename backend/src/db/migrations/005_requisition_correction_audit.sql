ALTER TABLE requisition_approvals DROP CONSTRAINT IF EXISTS requisition_approvals_decision_check;
ALTER TABLE requisition_approvals ADD CONSTRAINT requisition_approvals_decision_check
  CHECK (decision IN ('Approved', 'Partially Approved', 'Rejected', 'Returned for Correction'));