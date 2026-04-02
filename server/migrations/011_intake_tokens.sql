-- Public pre-brief links: consultant creates token; client answers without auth.

CREATE TABLE IF NOT EXISTS intake_tokens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(20), 'hex'),
  consultant_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audit_id        uuid REFERENCES audits(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}',
  responses       jsonb NOT NULL DEFAULT '{}',
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  submitted_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS intake_tokens_token_idx ON intake_tokens (token);
CREATE INDEX IF NOT EXISTS intake_tokens_consultant_idx ON intake_tokens (consultant_id);
