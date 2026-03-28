-- Migration 004: Product modes + Free Snapshot support
-- Adds product_mode (free_snapshot / express / full) to audits.
-- Adds snapshot_token for public, unauthenticated access to free snapshot results.
-- Makes user_id nullable so free snapshots can be created without auth,
-- but enforces NOT NULL for express/full via CHECK constraint.

-- ─── product_mode column ───────────────────────────────────
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS product_mode TEXT NOT NULL DEFAULT 'full'
    CHECK (product_mode IN ('free_snapshot', 'express', 'full'));

-- ─── snapshot_token — UUID for public polling of free snapshot ─
ALTER TABLE audits
  ADD COLUMN IF NOT EXISTS snapshot_token UUID;

-- ─── Allow user_id to be NULL for free_snapshot only ──────
ALTER TABLE audits ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE audits
  ADD CONSTRAINT audits_user_id_required
  CHECK (product_mode = 'free_snapshot' OR user_id IS NOT NULL);

-- ─── Index for fast token lookup ──────────────────────────
CREATE INDEX IF NOT EXISTS idx_audits_snapshot_token
  ON audits (snapshot_token)
  WHERE snapshot_token IS NOT NULL;

-- ─── Auto-expire free snapshots after 24h (optional cleanup hook) ─
-- TTL is enforced by the application layer (DELETE WHERE product_mode='free_snapshot'
-- AND created_at < now() - interval '24 hours') — no DB trigger needed at this stage.
