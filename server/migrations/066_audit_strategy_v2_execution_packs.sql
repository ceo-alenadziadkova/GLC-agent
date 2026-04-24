-- Strategy initiative schema version + persisted execution packs (Strategy Lab).

alter table public.audit_strategy
  add column if not exists schema_version smallint not null default 1;

comment on column public.audit_strategy.schema_version is
  '1 = legacy initiative rows; 2 = StrategyInitiative v2 (decision, evidence, execution_paths, scope).';

create table if not exists public.audit_strategy_execution_packs (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  initiative_ids text[] not null,
  selected_path_type text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_strategy_execution_packs_audit_id
  on public.audit_strategy_execution_packs (audit_id);

create index if not exists idx_audit_strategy_execution_packs_created_at
  on public.audit_strategy_execution_packs (audit_id, created_at desc);

comment on table public.audit_strategy_execution_packs is
  'On-demand Strategy Lab execution packs (Claude output) per audit; filtered by audit ownership in API.';
