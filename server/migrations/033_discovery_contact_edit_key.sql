-- Add hashed contact-edit secret for public discovery contact updates.
-- The raw secret is returned only once at session creation and never stored.

ALTER TABLE discovery_sessions
  ADD COLUMN IF NOT EXISTS contact_edit_key_hash TEXT;

CREATE INDEX IF NOT EXISTS discovery_sessions_contact_edit_key_hash_idx
  ON discovery_sessions (contact_edit_key_hash)
  WHERE contact_edit_key_hash IS NOT NULL;
