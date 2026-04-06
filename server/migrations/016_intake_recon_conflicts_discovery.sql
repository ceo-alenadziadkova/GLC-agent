-- Recon conflict log for agent context + discovery collection_mode (QUESTION_BANK §11).

ALTER TABLE intake_brief
  ADD COLUMN IF NOT EXISTS recon_conflicts jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE intake_brief
  DROP CONSTRAINT IF EXISTS intake_brief_collection_mode_check;

ALTER TABLE intake_brief
  ADD CONSTRAINT intake_brief_collection_mode_check CHECK (
    collection_mode IN ('self_serve', 'interview', 'pre_brief', 'discovery')
  );
