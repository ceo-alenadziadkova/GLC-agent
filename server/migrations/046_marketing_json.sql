-- Targeted indexes aligned with Supabase Query / Index advisor (PostgREST patterns).
-- Skips notifications: migration 014 already defines notifications_user_created_idx
-- (user_id, created_at DESC), which covers WHERE user_id = ? ORDER BY created_at DESC.

-- Pipeline: global newest-first scans (service_role + join to audits)
CREATE INDEX IF NOT EXISTS idx_pipeline_events_created_at_desc
  ON public.pipeline_events (created_at DESC);

-- Discovery list: (consultant_id = $me OR consultant_id IS NULL) ORDER BY created_at DESC
-- Replaces narrow partial index from 032 with composite for the claimed branch;
-- unclaimed rows still use discovery_sessions_created_idx (013) for sort.
DROP INDEX IF EXISTS public.discovery_sessions_consultant_idx;
CREATE INDEX IF NOT EXISTS discovery_sessions_consultant_created_idx
  ON public.discovery_sessions (consultant_id, created_at DESC)
  WHERE consultant_id IS NOT NULL;

-- Client portal admin list: ORDER BY created_at DESC (service_role)
CREATE INDEX IF NOT EXISTS audit_requests_created_at_idx
  ON public.audit_requests (created_at DESC);
