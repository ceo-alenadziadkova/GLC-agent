-- 013_discovery_sessions.sql
-- Stores anonymous discovery sessions from /audit/discover (Mode C).
-- No RLS: service role handles all ops; session_token is unguessable (hex-40).

CREATE TABLE IF NOT EXISTS discovery_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(20), 'hex'),
  answers         JSONB       NOT NULL DEFAULT '{}',
  maturity_level  INT         NOT NULL CHECK (maturity_level BETWEEN 1 AND 4),
  findings        JSONB       NOT NULL DEFAULT '[]',
  -- Optional contact details filled after seeing results
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  -- Set when a consultant converts this session into a full audit
  audit_id        UUID        REFERENCES audits(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS discovery_sessions_token_idx   ON discovery_sessions (session_token);
CREATE INDEX IF NOT EXISTS discovery_sessions_created_idx ON discovery_sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS discovery_sessions_audit_idx   ON discovery_sessions (audit_id)
  WHERE audit_id IS NOT NULL;
