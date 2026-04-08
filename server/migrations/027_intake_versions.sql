-- ADR intake: persist version tuple used to render/validate brief (client/server parity).
ALTER TABLE intake_brief
  ADD COLUMN IF NOT EXISTS intake_versions jsonb;

COMMENT ON COLUMN intake_brief.intake_versions IS
  'Optional { questionBankVersion, policyVersion, layoutVersion, resolverVersion }. NULL = row created before this column; readers may synthesize v0 for diagnostics.';
