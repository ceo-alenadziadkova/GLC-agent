-- Strategy Lab: persisted manual overrides for constraint snapshot (merge over intake brief).

alter table public.audit_strategy
  add column if not exists strategy_lab_context jsonb not null default '{}'::jsonb;

comment on column public.audit_strategy.strategy_lab_context is
  'Optional overrides for company_stage, budget_band, team_scale; merged over brief-derived snapshot in post-process and GET audit.';
