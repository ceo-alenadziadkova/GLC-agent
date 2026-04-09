-- Read-only views for Metabase / Supabase SQL charts (ADR Phase G).
-- Evaluated at query time; relative windows use now().

CREATE OR REPLACE VIEW public.intake_analytics_daily_surface AS
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

CREATE OR REPLACE VIEW public.intake_analytics_question_funnel_30d AS
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

CREATE OR REPLACE VIEW public.intake_analytics_version_mix_30d AS
SELECT
  COALESCE(intake_versions->>'policyVersion', '') AS policy_version,
  COALESCE(intake_versions->>'resolverVersion', '') AS resolver_version,
  COALESCE(intake_versions->>'questionBankVersion', '') AS question_bank_version,
  surface,
  COUNT(*) AS event_count
FROM public.intake_analytics_events
WHERE created_at >= (now() AT TIME ZONE 'utc') - interval '30 days'
GROUP BY 1, 2, 3, 4;

CREATE OR REPLACE VIEW public.intake_analytics_audit_attributed_30d AS
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
