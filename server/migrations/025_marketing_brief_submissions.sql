-- Public marketing brief submissions (no auth). Inserted via Express + service role only.

CREATE TABLE IF NOT EXISTS marketing_brief_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  company text,
  website text,
  no_website boolean NOT NULL DEFAULT false,
  concern text NOT NULL DEFAULT '',
  improve text NOT NULL DEFAULT '',
  urgency text NOT NULL DEFAULT '',
  contact_method text NOT NULL DEFAULT '',
  unsure_choice boolean NOT NULL DEFAULT false,
  recommended_route text NOT NULL,
  user_agent text
);

CREATE INDEX IF NOT EXISTS marketing_brief_submissions_created_at_idx
  ON marketing_brief_submissions (created_at DESC);

ALTER TABLE marketing_brief_submissions ENABLE ROW LEVEL SECURITY;
