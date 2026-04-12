-- Replace paired policies (consultant FOR ALL + client FOR SELECT) with:
--   one SELECT policy (consultant OR client on same audit)
--   separate INSERT / UPDATE / DELETE policies (consultant-owned audit only)
-- Fixes Supabase advisor lint 0006_multiple_permissive_policies on these tables.
-- Uses (select auth.uid()) per 0003_auth_rls_initplan (migration 043).

-- -----------------------------------------------------------------------------
-- audits
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own audits" ON audits;
DROP POLICY IF EXISTS "audits_select_own_client" ON audits;

CREATE POLICY audits_select_scoped ON audits
  FOR SELECT
  USING (
    (select auth.uid()) = user_id
    OR (select auth.uid()) = client_id
  );

CREATE POLICY audits_insert_consultant ON audits
  FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY audits_update_consultant ON audits
  FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY audits_delete_consultant ON audits
  FOR DELETE
  USING ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- audit_domains
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own domains" ON audit_domains;
DROP POLICY IF EXISTS "audit_domains_select_client" ON audit_domains;

CREATE POLICY audit_domains_select_scoped ON audit_domains
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE user_id = (select auth.uid()) OR client_id = (select auth.uid())
    )
  );

CREATE POLICY audit_domains_insert_consultant ON audit_domains
  FOR INSERT
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY audit_domains_update_consultant ON audit_domains
  FOR UPDATE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY audit_domains_delete_consultant ON audit_domains
  FOR DELETE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- audit_strategy
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own strategy" ON audit_strategy;
DROP POLICY IF EXISTS "audit_strategy_select_client" ON audit_strategy;

CREATE POLICY audit_strategy_select_scoped ON audit_strategy
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE user_id = (select auth.uid()) OR client_id = (select auth.uid())
    )
  );

CREATE POLICY audit_strategy_insert_consultant ON audit_strategy
  FOR INSERT
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY audit_strategy_update_consultant ON audit_strategy
  FOR UPDATE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY audit_strategy_delete_consultant ON audit_strategy
  FOR DELETE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- pipeline_events
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own events" ON pipeline_events;
DROP POLICY IF EXISTS "pipeline_events_select_client" ON pipeline_events;

CREATE POLICY pipeline_events_select_scoped ON pipeline_events
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE user_id = (select auth.uid()) OR client_id = (select auth.uid())
    )
  );

CREATE POLICY pipeline_events_insert_consultant ON pipeline_events
  FOR INSERT
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY pipeline_events_update_consultant ON pipeline_events
  FOR UPDATE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY pipeline_events_delete_consultant ON pipeline_events
  FOR DELETE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

-- -----------------------------------------------------------------------------
-- review_points
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own reviews" ON review_points;
DROP POLICY IF EXISTS "review_points_select_client" ON review_points;

CREATE POLICY review_points_select_scoped ON review_points
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE user_id = (select auth.uid()) OR client_id = (select auth.uid())
    )
  );

CREATE POLICY review_points_insert_consultant ON review_points
  FOR INSERT
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY review_points_update_consultant ON review_points
  FOR UPDATE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  )
  WITH CHECK (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

CREATE POLICY review_points_delete_consultant ON review_points
  FOR DELETE
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );
