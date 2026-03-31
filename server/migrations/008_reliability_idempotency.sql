-- Sprint 5 reliability foundation:
-- idempotency key storage for critical write operations.

CREATE TABLE IF NOT EXISTS api_idempotency_keys (
  id              bigserial PRIMARY KEY,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  route           text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash    text NOT NULL,
  response_status int NOT NULL,
  response_body   jsonb NOT NULL DEFAULT '{}'::jsonb,
  audit_id        uuid REFERENCES audits(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_api_idempotency_keys_user_route_key
  ON api_idempotency_keys(user_id, route, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_api_idempotency_keys_expires_at
  ON api_idempotency_keys(expires_at);
