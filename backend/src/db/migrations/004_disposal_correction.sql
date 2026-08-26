ALTER TABLE disposals DROP CONSTRAINT IF EXISTS disposals_status_check;
ALTER TABLE disposals ADD CONSTRAINT disposals_status_check
  CHECK (status IN ('Flagged','Requested','Pending','Pending Review','Approved','Rejected','Returned for Correction','Executed','Completed'));