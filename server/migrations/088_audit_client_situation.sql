-- Collaborative Director Protocol (Foundation): Context Director snapshot storage.
-- Additive migration; safe for mixed rollout states.

create table if not exists public.audit_client_situation (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  schema_version integer not null default 1,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id)
);

create index if not exists idx_audit_client_situation_audit_id
  on public.audit_client_situation (audit_id);

create index if not exists idx_audit_client_situation_updated_at
  on public.audit_client_situation (updated_at desc);

comment on table public.audit_client_situation is
  'Collaborative protocol Phase 0.5 snapshot (ClientSituationSnapshot) per audit.';

alter table public.audit_client_situation enable row level security;

drop policy if exists audit_client_situation_no_select on public.audit_client_situation;
create policy audit_client_situation_no_select on public.audit_client_situation
  for select using (false);

drop policy if exists audit_client_situation_no_insert on public.audit_client_situation;
create policy audit_client_situation_no_insert on public.audit_client_situation
  for insert with check (false);

drop policy if exists audit_client_situation_no_update on public.audit_client_situation;
create policy audit_client_situation_no_update on public.audit_client_situation
  for update using (false) with check (false);

drop policy if exists audit_client_situation_no_delete on public.audit_client_situation;
create policy audit_client_situation_no_delete on public.audit_client_situation
  for delete using (false);

