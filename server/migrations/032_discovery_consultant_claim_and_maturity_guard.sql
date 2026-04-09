-- Harden discovery conversion ownership and enforce current maturity score range.
-- - consultant_id lets a consultant claim a discovery session before conversion.
-- - maturity_level guard is kept at 1..5 (self-heal for environments that drifted).

ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS consultant_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS discovery_sessions_consultant_idx
  ON discovery_sessions (consultant_id)
  WHERE consultant_id IS NOT NULL;

ALTER TABLE discovery_sessions DROP CONSTRAINT IF EXISTS discovery_sessions_maturity_level_check;

ALTER TABLE discovery_sessions ADD CONSTRAINT discovery_sessions_maturity_level_check
  CHECK (maturity_level >= 1 AND maturity_level <= 5);
