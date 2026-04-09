-- Log intake_versions upgrades / repairs (ADR version matrix).
ALTER TABLE intake_brief
  ADD COLUMN IF NOT EXISTS intake_version_migration jsonb;

COMMENT ON COLUMN intake_brief.intake_version_migration IS
  'Optional { from, to, at, reason } when intake_versions moved between supported artifact tuples.';
