-- Enforce structured brief cells only: responses_format = 2 (legacy flat JSON values no longer supported for new writes).

ALTER TABLE intake_brief DROP CONSTRAINT IF EXISTS intake_brief_responses_format_check;
UPDATE intake_brief SET responses_format = 2 WHERE responses_format IS DISTINCT FROM 2;
ALTER TABLE intake_brief
  ALTER COLUMN responses_format SET DEFAULT 2,
  ADD CONSTRAINT intake_brief_responses_format_check CHECK (responses_format = 2);
