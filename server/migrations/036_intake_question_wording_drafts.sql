-- Per-consultant wording drafts for question-bank labels (ADR wording lifecycle, Phase B/C bridge).
-- Canonical branch/policy artifacts remain unchanged; drafts are UI copy overlays only.

CREATE TABLE IF NOT EXISTS intake_question_wording_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  draft_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT intake_question_wording_drafts_question_id_len CHECK (char_length(question_id) <= 64),
  CONSTRAINT intake_question_wording_drafts_unique_user_question UNIQUE (user_id, question_id)
);

CREATE INDEX IF NOT EXISTS intake_question_wording_drafts_user_idx
  ON intake_question_wording_drafts (user_id);

ALTER TABLE intake_question_wording_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intake_question_wording_drafts_select_own ON intake_question_wording_drafts;
DROP POLICY IF EXISTS intake_question_wording_drafts_insert_own ON intake_question_wording_drafts;
DROP POLICY IF EXISTS intake_question_wording_drafts_update_own ON intake_question_wording_drafts;
DROP POLICY IF EXISTS intake_question_wording_drafts_delete_own ON intake_question_wording_drafts;

CREATE POLICY intake_question_wording_drafts_select_own
  ON intake_question_wording_drafts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY intake_question_wording_drafts_insert_own
  ON intake_question_wording_drafts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY intake_question_wording_drafts_update_own
  ON intake_question_wording_drafts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY intake_question_wording_drafts_delete_own
  ON intake_question_wording_drafts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE intake_question_wording_drafts IS
  'Consultant-local draft wording per question id; server persistence for intake trace / wording workspace.';
