-- Migration 010: Intake progress/gamification contract fields
-- Adds server-derived readiness fields and progressive intake metadata.

ALTER TABLE intake_brief
  ADD COLUMN IF NOT EXISTS layer_completed smallint NOT NULL DEFAULT 0 CHECK (layer_completed >= 0 AND layer_completed <= 3),
  ADD COLUMN IF NOT EXISTS collected_by text NOT NULL DEFAULT 'client' CHECK (collected_by IN ('client', 'consultant')),
  ADD COLUMN IF NOT EXISTS collection_mode text NOT NULL DEFAULT 'self_serve' CHECK (collection_mode IN ('self_serve', 'interview', 'pre_brief')),
  ADD COLUMN IF NOT EXISTS data_quality_score numeric(4,3) NOT NULL DEFAULT 0 CHECK (data_quality_score >= 0 AND data_quality_score <= 1),
  ADD COLUMN IF NOT EXISTS answered_optional int NOT NULL DEFAULT 0 CHECK (answered_optional >= 0),
  ADD COLUMN IF NOT EXISTS total_required int NOT NULL DEFAULT 0 CHECK (total_required >= 0),
  ADD COLUMN IF NOT EXISTS total_recommended int NOT NULL DEFAULT 0 CHECK (total_recommended >= 0),
  ADD COLUMN IF NOT EXISTS total_optional int NOT NULL DEFAULT 0 CHECK (total_optional >= 0),
  ADD COLUMN IF NOT EXISTS recon_prefills jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS post_audit_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS progress_pct smallint NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  ADD COLUMN IF NOT EXISTS readiness_badge text NOT NULL DEFAULT 'low' CHECK (readiness_badge IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS next_best_action text NOT NULL DEFAULT 'complete_required'
    CHECK (next_best_action IN ('complete_required', 'add_recommended', 'confirm_prefill', 'none')),
  ADD COLUMN IF NOT EXISTS responses_format int NOT NULL DEFAULT 1 CHECK (responses_format IN (1, 2));
