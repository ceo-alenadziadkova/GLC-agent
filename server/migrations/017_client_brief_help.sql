-- Optional client request for consultant help with the intake brief (self-serve portal).

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS brief_help_requested_at timestamptz;

ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS brief_help_client_message text;
