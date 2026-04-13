-- Adds partial-audit execution plan contract to audits.
alter table public.audits
  add column if not exists execution_plan jsonb;

comment on column public.audits.execution_plan is
  'User/system selected domain coverage and depth plan for partial audit execution.';

create index if not exists idx_audits_execution_plan_gin
  on public.audits
  using gin (execution_plan jsonb_path_ops);
