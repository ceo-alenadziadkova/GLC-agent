-- ADR wording: last-known-good published copy per question + audit log (consultant tool).
-- Published snapshot does not change branch logic; UI/report copy overlay only.

ALTER TABLE intake_question_wording_drafts
  ADD COLUMN IF NOT EXISTS published_text TEXT NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN intake_question_wording_drafts.published_text IS
  'Last explicitly published wording for this question id (immutable until next publish).';
COMMENT ON COLUMN intake_question_wording_drafts.published_at IS
  'Timestamp of last publish for this row.';

CREATE TABLE IF NOT EXISTS intake_wording_publication_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('publish', 'rollback')),
  question_ids TEXT[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intake_wording_publication_log_user_created_idx
  ON intake_wording_publication_log (user_id, created_at DESC);

ALTER TABLE intake_wording_publication_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intake_wording_publication_log_select_own ON intake_wording_publication_log;

CREATE POLICY intake_wording_publication_log_select_own
  ON intake_wording_publication_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE intake_wording_publication_log IS
  'Append-only audit of publish/rollback actions from the intake wording tool (API writes via service role).';
