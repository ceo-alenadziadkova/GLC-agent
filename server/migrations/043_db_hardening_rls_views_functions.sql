-- Hardening: security_invoker views, fixed search_path on functions, RLS initplan (select auth.uid()),
-- explicit deny policies for backend-only tables, FK covering indexes.
-- See Supabase advisors: 0010_security_definer_view, 0011_function_search_path_mutable, 0003_auth_rls_initplan,
-- 0008_rls_enabled_no_policy, 0001_unindexed_foreign_keys.

-- -----------------------------------------------------------------------------
-- 1) Functions: immutable search_path (Supabase lint 0011)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_tokens_used(audit_id_input uuid, increment integer)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.audits
  SET tokens_used = public.audits.tokens_used + increment
  WHERE id = audit_id_input;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.discovery_convert_session_atomic(
  p_session_token TEXT,
  p_consultant_id UUID,
  p_company_url TEXT,
  p_product_mode TEXT,
  p_review_phases INT[],
  p_domain_keys TEXT[]
)
RETURNS TABLE (
  audit_id UUID,
  error_code TEXT,
  answers JSONB
)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_session discovery_sessions%ROWTYPE;
  v_audit_id UUID;
  v_industry TEXT;
  v_company_name TEXT;
BEGIN
  SELECT *
  INTO v_session
  FROM discovery_sessions
  WHERE session_token = p_session_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, 'not_found'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_session.audit_id IS NOT NULL THEN
    RETURN QUERY SELECT v_session.audit_id, 'already_converted'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_session.consultant_id IS NOT NULL AND v_session.consultant_id <> p_consultant_id THEN
    RETURN QUERY SELECT NULL::UUID, 'forbidden_owner'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF v_session.consultant_id IS NULL THEN
    UPDATE discovery_sessions ds
    SET consultant_id = p_consultant_id
    WHERE ds.id = v_session.id
      AND ds.consultant_id IS NULL
      AND ds.audit_id IS NULL;
    IF NOT FOUND THEN
      RETURN QUERY SELECT NULL::UUID, 'claim_conflict'::TEXT, NULL::JSONB;
      RETURN;
    END IF;
  END IF;

  v_industry :=
    NULLIF(TRIM(COALESCE(v_session.answers->>'a2', v_session.answers->>'industry', '')), '');
  v_company_name :=
    NULLIF(TRIM(COALESCE(v_session.contact_name, v_session.contact_company, '')), '');

  INSERT INTO audits (user_id, company_url, company_name, industry, product_mode)
  VALUES (p_consultant_id, p_company_url, v_company_name, v_industry, p_product_mode)
  RETURNING id INTO v_audit_id;

  INSERT INTO review_points (audit_id, after_phase)
  SELECT v_audit_id, phase FROM unnest(p_review_phases) AS phase;

  INSERT INTO audit_domains (audit_id, domain_key, phase_number)
  SELECT v_audit_id, key, idx::INT
  FROM unnest(p_domain_keys) WITH ORDINALITY AS t(key, idx);

  INSERT INTO audit_recon (audit_id) VALUES (v_audit_id);
  INSERT INTO audit_strategy (audit_id) VALUES (v_audit_id);

  UPDATE discovery_sessions ds
  SET audit_id = v_audit_id,
      consultant_id = p_consultant_id
  WHERE ds.id = v_session.id
    AND ds.consultant_id = p_consultant_id
    AND ds.audit_id IS NULL;

  IF NOT FOUND THEN
    DELETE FROM audits a WHERE a.id = v_audit_id AND a.user_id = p_consultant_id;
    RETURN QUERY SELECT NULL::UUID, 'link_conflict'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  RETURN QUERY SELECT v_audit_id, NULL::TEXT, v_session.answers;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Analytics views: enforce invoker RLS on underlying tables (PG15+; lint 0010)
-- -----------------------------------------------------------------------------

DROP VIEW IF EXISTS public.intake_analytics_audit_attributed_30d;
DROP VIEW IF EXISTS public.intake_analytics_version_mix_30d;
DROP VIEW IF EXISTS public.intake_analytics_question_funnel_30d;
DROP VIEW IF EXISTS public.intake_analytics_daily_surface;

CREATE VIEW public.intake_analytics_daily_surface
WITH (security_invoker = true) AS
SELECT
  (created_at AT TIME ZONE 'UTC')::date AS day_utc,
  surface,
  event_type,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE audit_id IS NOT NULL) AS events_with_audit,
  COUNT(DISTINCT client_session_id) AS distinct_sessions
FROM public.intake_analytics_events
WHERE created_at >= (now() AT TIME ZONE 'utc') - interval '180 days'
GROUP BY 1, 2, 3;

CREATE VIEW public.intake_analytics_question_funnel_30d
WITH (security_invoker = true) AS
SELECT
  surface,
  question_id,
  COUNT(*) FILTER (WHERE event_type = 'question_shown') AS shown,
  COUNT(*) FILTER (WHERE event_type = 'question_answered') AS answered,
  COUNT(*) FILTER (WHERE event_type = 'question_skipped') AS skipped,
  COUNT(*) FILTER (WHERE event_type = 'wizard_completed') AS wizard_completed,
  COUNT(*) FILTER (WHERE event_type = 'results_viewed') AS results_viewed
FROM public.intake_analytics_events
WHERE question_id IS NOT NULL
  AND created_at >= (now() AT TIME ZONE 'utc') - interval '30 days'
GROUP BY surface, question_id;

CREATE VIEW public.intake_analytics_version_mix_30d
WITH (security_invoker = true) AS
SELECT
  COALESCE(intake_versions->>'policyVersion', '') AS policy_version,
  COALESCE(intake_versions->>'resolverVersion', '') AS resolver_version,
  COALESCE(intake_versions->>'questionBankVersion', '') AS question_bank_version,
  surface,
  COUNT(*) AS event_count
FROM public.intake_analytics_events
WHERE created_at >= (now() AT TIME ZONE 'utc') - interval '30 days'
GROUP BY 1, 2, 3, 4;

CREATE VIEW public.intake_analytics_audit_attributed_30d
WITH (security_invoker = true) AS
SELECT
  a.id AS audit_id,
  a.product_mode,
  e.surface,
  COUNT(*) AS event_count,
  MIN(e.created_at) AS first_event_at,
  MAX(e.created_at) AS last_event_at
FROM public.intake_analytics_events e
JOIN public.audits a ON a.id = e.audit_id
WHERE e.created_at >= (now() AT TIME ZONE 'utc') - interval '30 days'
GROUP BY a.id, a.product_mode, e.surface;

COMMENT ON VIEW public.intake_analytics_daily_surface IS 'Daily funnel counts by surface and event_type (rolling 180d window in base table filter).';
COMMENT ON VIEW public.intake_analytics_question_funnel_30d IS 'Per-question shown / answered / skipped for wizard diagnostics (30d).';
COMMENT ON VIEW public.intake_analytics_version_mix_30d IS 'Intake version tuple mix from JSON payload (30d).';
COMMENT ON VIEW public.intake_analytics_audit_attributed_30d IS 'Events linked to audits (30d), for brief wizard attribution.';

-- -----------------------------------------------------------------------------
-- 3) RLS: wrap auth.uid() as (select auth.uid()) — lint 0003_auth_rls_initplan
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Users see own audits" ON audits;
CREATE POLICY "Users see own audits" ON audits
  FOR ALL
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users see own recon" ON audit_recon;
CREATE POLICY "Users see own recon" ON audit_recon
  FOR ALL
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users see own domains" ON audit_domains;
CREATE POLICY "Users see own domains" ON audit_domains
  FOR ALL
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "audit_domains_select_client" ON audit_domains;
CREATE POLICY "audit_domains_select_client" ON audit_domains
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = (select auth.uid()) OR user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users see own strategy" ON audit_strategy;
CREATE POLICY "Users see own strategy" ON audit_strategy
  FOR ALL
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "audit_strategy_select_client" ON audit_strategy;
CREATE POLICY "audit_strategy_select_client" ON audit_strategy
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = (select auth.uid()) OR user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users see own events" ON pipeline_events;
CREATE POLICY "Users see own events" ON pipeline_events
  FOR ALL
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "pipeline_events_select_client" ON pipeline_events;
CREATE POLICY "pipeline_events_select_client" ON pipeline_events
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = (select auth.uid()) OR user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users see own collected data" ON collected_data;
CREATE POLICY "Users see own collected data" ON collected_data
  FOR ALL
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "Users see own reviews" ON review_points;
CREATE POLICY "Users see own reviews" ON review_points
  FOR ALL
  USING (
    audit_id IN (SELECT id FROM audits WHERE user_id = (select auth.uid()))
  );

DROP POLICY IF EXISTS "review_points_select_client" ON review_points;
CREATE POLICY "review_points_select_client" ON review_points
  FOR SELECT
  USING (
    audit_id IN (
      SELECT id FROM audits
      WHERE client_id = (select auth.uid()) OR user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE
  USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "audit_requests_select_own" ON audit_requests;
CREATE POLICY "audit_requests_select_own" ON audit_requests
  FOR SELECT
  USING (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "audit_requests_insert_own" ON audit_requests;
CREATE POLICY "audit_requests_insert_own" ON audit_requests
  FOR INSERT
  WITH CHECK (client_id = (select auth.uid()));

DROP POLICY IF EXISTS "audit_requests_update_own" ON audit_requests;
CREATE POLICY "audit_requests_update_own" ON audit_requests
  FOR UPDATE
  USING (
    client_id = (select auth.uid())
    AND status IN ('draft', 'submitted')
  );

DROP POLICY IF EXISTS "audits_select_own_client" ON audits;
CREATE POLICY "audits_select_own_client" ON audits
  FOR SELECT
  USING (
    client_id = (select auth.uid())
    OR user_id = (select auth.uid())
  );

DROP POLICY IF EXISTS "intake_brief_select_via_audit" ON intake_brief;
CREATE POLICY "intake_brief_select_via_audit" ON intake_brief
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM audits a
      WHERE a.id = audit_id
        AND (
          a.user_id = (select auth.uid())
          OR a.client_id = (select auth.uid())
        )
    )
  );

DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS intake_question_wording_drafts_select_own ON intake_question_wording_drafts;
CREATE POLICY intake_question_wording_drafts_select_own
  ON intake_question_wording_drafts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS intake_question_wording_drafts_insert_own ON intake_question_wording_drafts;
CREATE POLICY intake_question_wording_drafts_insert_own
  ON intake_question_wording_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS intake_question_wording_drafts_update_own ON intake_question_wording_drafts;
CREATE POLICY intake_question_wording_drafts_update_own
  ON intake_question_wording_drafts
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS intake_question_wording_drafts_delete_own ON intake_question_wording_drafts;
CREATE POLICY intake_question_wording_drafts_delete_own
  ON intake_question_wording_drafts
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS intake_wording_publication_log_select_own ON intake_wording_publication_log;
CREATE POLICY intake_wording_publication_log_select_own
  ON intake_wording_publication_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- -----------------------------------------------------------------------------
-- 4) Backend-only tables: explicit deny for API roles (lint 0008; defense in depth)
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS api_idempotency_keys_deny_client_access ON api_idempotency_keys;
CREATE POLICY api_idempotency_keys_deny_client_access
  ON api_idempotency_keys FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS discovery_sessions_deny_client_access ON discovery_sessions;
CREATE POLICY discovery_sessions_deny_client_access
  ON discovery_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS marketing_brief_submissions_deny_client_access ON marketing_brief_submissions;
CREATE POLICY marketing_brief_submissions_deny_client_access
  ON marketing_brief_submissions FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS platform_settings_deny_client_access ON platform_settings;
CREATE POLICY platform_settings_deny_client_access
  ON platform_settings FOR ALL
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS snapshot_fresh_lease_deny_client_access ON snapshot_fresh_lease;
CREATE POLICY snapshot_fresh_lease_deny_client_access
  ON snapshot_fresh_lease FOR ALL
  USING (false)
  WITH CHECK (false);

-- -----------------------------------------------------------------------------
-- 5) Covering indexes for foreign keys (lint 0001)
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_audit_id
  ON public.api_idempotency_keys (audit_id)
  WHERE audit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_intake_tokens_audit_id
  ON public.intake_tokens (audit_id)
  WHERE audit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_settings_self_serve_owner
  ON public.platform_settings (self_serve_audit_owner_user_id)
  WHERE self_serve_audit_owner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by
  ON public.platform_settings (updated_by)
  WHERE updated_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_snapshot_guest_sessions_claimed_by
  ON public.snapshot_guest_sessions (claimed_by_user_id)
  WHERE claimed_by_user_id IS NOT NULL;
