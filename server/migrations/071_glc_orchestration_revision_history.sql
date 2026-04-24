-- Persist rolling revision history for orchestration pack diffs (newest-first).

alter table public.audit_strategy
  add column if not exists glc_orchestration_revision_history jsonb not null default '[]'::jsonb;

comment on column public.audit_strategy.glc_orchestration_revision_history is
  'Rolling list of structured orchestration pack diffs across revisions (newest-first, bounded in app policy).';
