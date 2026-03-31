-- Migration 007: Finding Provenance
-- Adds confidence_distribution and unknown_items to audit_domains.
-- Issues already stored as jsonb[] — new fields (confidence, evidence_refs, data_source)
-- are added inside each issue object by the agents; no schema change needed for the array itself.

ALTER TABLE audit_domains
  ADD COLUMN IF NOT EXISTS confidence_distribution jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS unknown_items           jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN audit_domains.confidence_distribution IS
  'Distribution of finding confidence levels: {high: N, medium: N, low: N}. Set by BaseAgent after fact-check.';

COMMENT ON COLUMN audit_domains.unknown_items IS
  'Areas where data was unavailable or unmeasurable. Array of strings. Set by agent via submit_analysis.';
