-- Migration 003: Atomic token increment RPC
-- Fixes race condition in TokenTracker where parallel phases could
-- simultaneously read-then-write tokens_used, causing undercounting.
-- Called by server/src/services/token-tracker.ts via supabase.rpc()

CREATE OR REPLACE FUNCTION increment_tokens_used(audit_id_input uuid, increment integer)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE audits SET tokens_used = tokens_used + increment WHERE id = audit_id_input;
$$;
