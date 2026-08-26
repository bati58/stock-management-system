-- Idempotent migration: widen workflow status CHECK constraints so requisitions
-- and material transfers can carry the 'Returned for Correction' state introduced
-- in the Phase 1 workflow reconciliation. Safe to re-run.
--
-- schema.sql remains the source of truth; this patches an already-created DB
-- without a full db:reset (which would drop all data).

ALTER TABLE requisitions DROP CONSTRAINT IF EXISTS requisitions_status_check;
ALTER TABLE requisitions ADD CONSTRAINT requisitions_status_check
  CHECK (status IN ('Draft','Submitted','Pending','Pending Approval','Partially Approved','Approved','Ready for Issue','Partially Issued','Fulfilled','Rejected','Returned for Correction','Cancelled'));

ALTER TABLE material_transfers DROP CONSTRAINT IF EXISTS material_transfers_status_check;
ALTER TABLE material_transfers ADD CONSTRAINT material_transfers_status_check
  CHECK (status IN ('Draft','Submitted','Pending','Pending Approval','Approved','Dispatched','Received','Completed','Rejected','Returned for Correction'));
