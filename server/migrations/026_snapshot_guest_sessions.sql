-- Guest funnel for public free snapshot (no Supabase anonymous auth).
-- Rows track browser guest sessions and link to audits.snapshot_token until claim.

CREATE TABLE IF NOT EXISTS snapshot_guest_sessions (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_session_token   text NOT NULL UNIQUE,
  snapshot_token        uuid UNIQUE,
  status                text NOT NULL DEFAULT 'started'
    CHECK (status IN ('started', 'running', 'completed', 'failed', 'claimed', 'expired')),
  company_url           text,
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  referrer              text,
  user_agent            text,
  ip_hash               text,
  claimed_by_user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at            timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  expires_at            timestamptz NOT NULL DEFAULT (now() + interval '90 days')
);

CREATE INDEX IF NOT EXISTS idx_snapshot_guest_sessions_snapshot_token
  ON snapshot_guest_sessions (snapshot_token)
  WHERE snapshot_token IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_snapshot_guest_sessions_status_created
  ON snapshot_guest_sessions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshot_guest_sessions_expires
  ON snapshot_guest_sessions (expires_at)
  WHERE status NOT IN ('claimed', 'expired');

COMMENT ON TABLE snapshot_guest_sessions IS
  'Funnel tracking for anonymous snapshot visitors; claim links audit to auth.users via audits.client_id.';

DROP TRIGGER IF EXISTS snapshot_guest_sessions_updated_at ON snapshot_guest_sessions;
CREATE TRIGGER snapshot_guest_sessions_updated_at
  BEFORE UPDATE ON snapshot_guest_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
