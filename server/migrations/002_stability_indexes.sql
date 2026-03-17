-- GLC Audit Platform — Stability Indexes (Sprint 3 P0)
-- Run this in Supabase SQL Editor after 001_initial_schema.sql

-- ─── Composite index for saveDomainResult() atomic UPDATE ──
-- Query: UPDATE audit_domains WHERE audit_id=? AND domain_key=? AND status='pending'
-- Without this index, Postgres scans the audit_id index then filters — slow at scale.
CREATE INDEX IF NOT EXISTS idx_audit_domains_pending
  ON audit_domains(audit_id, domain_key, status);

-- ─── Composite index for pipeline /next review point check ─
-- Query: SELECT * FROM review_points WHERE audit_id=? AND after_phase=? AND status='pending'
CREATE INDEX IF NOT EXISTS idx_review_points_lookup
  ON review_points(audit_id, after_phase, status);

-- ─── Composite index for collector cache lookup ─────────────
-- Query: SELECT/UPSERT collected_data WHERE audit_id=? AND collector_key=?
-- Supersedes the existing single-column idx_collected_data_audit.
CREATE INDEX IF NOT EXISTS idx_collected_data_lookup
  ON collected_data(audit_id, collector_key);
