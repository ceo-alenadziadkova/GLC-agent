-- Migration 038: Remove cross-tenant free_snapshot read access via audits RLS policy.
-- Snapshot public access must remain token-gated via backend routes, not broad RLS clauses.

DROP POLICY IF EXISTS "audits_select_own_client" ON audits;

CREATE POLICY "audits_select_own_client"
  ON audits FOR SELECT
  USING (
    client_id = auth.uid()
    OR user_id = auth.uid()
  );
