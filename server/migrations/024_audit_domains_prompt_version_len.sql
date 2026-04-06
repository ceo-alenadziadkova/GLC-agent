-- Widen audit_domains.prompt_version: snapshot deterministic label exceeded VARCHAR(20).
-- Migration 009 used VARCHAR(20); free snapshot writes a longer engine label.
ALTER TABLE audit_domains
  ALTER COLUMN prompt_version TYPE VARCHAR(64);
