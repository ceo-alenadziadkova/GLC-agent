-- Allow 1–5 triage score from discovery findings count; optional company on contact save.

ALTER TABLE discovery_sessions DROP CONSTRAINT IF EXISTS discovery_sessions_maturity_level_check;

ALTER TABLE discovery_sessions ADD CONSTRAINT discovery_sessions_maturity_level_check
  CHECK (maturity_level >= 1 AND maturity_level <= 5);

ALTER TABLE discovery_sessions ADD COLUMN IF NOT EXISTS contact_company TEXT;
