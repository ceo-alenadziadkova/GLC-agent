-- 015_audit_request_guards.sql
-- Hard DB-level guards against inconsistent audit_request states
-- caused by concurrent writes or API bypass.

-- 1) One request can map to at most one audit, and one audit can be linked
-- to at most one request.
CREATE UNIQUE INDEX IF NOT EXISTS ux_audit_requests_audit_id_not_null
  ON audit_requests(audit_id)
  WHERE audit_id IS NOT NULL;

-- 2) Status/audit_id consistency:
-- finalized execution statuses must always be linked to an audit row.
ALTER TABLE audit_requests
  DROP CONSTRAINT IF EXISTS chk_audit_requests_status_requires_audit;

ALTER TABLE audit_requests
  ADD CONSTRAINT chk_audit_requests_status_requires_audit
  CHECK (
    (status IN ('approved', 'running', 'delivered') AND audit_id IS NOT NULL)
    OR (status IN ('draft', 'submitted', 'under_review', 'rejected'))
  );

