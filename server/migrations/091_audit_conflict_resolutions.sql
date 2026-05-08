-- Collaborative Director Protocol (Foundation): conflict resolution bundle.
-- Additive migration; safe for mixed rollout states.

create table if not exists public.audit_conflict_resolutions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  schema_version integer not null default 1,
  resolution jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id)
);

create index if not exists idx_audit_conflict_resolutions_audit_id
  on public.audit_conflict_resolutions (audit_id);

comment on table public.audit_conflict_resolutions is
  'Collaborative protocol Phase 3 cross-domain conflict resolution per audit.';

alter table public.audit_conflict_resolutions enable row level security;

drop policy if exists audit_conflict_resolutions_no_select on public.audit_conflict_resolutions;
create policy audit_conflict_resolutions_no_select on public.audit_conflict_resolutions
  for select using (false);

drop policy if exists audit_conflict_resolutions_no_insert on public.audit_conflict_resolutions;
create policy audit_conflict_resolutions_no_insert on public.audit_conflict_resolutions
  for insert with check (false);

drop policy if exists audit_conflict_resolutions_no_update on public.audit_conflict_resolutions;
create policy audit_conflict_resolutions_no_update on public.audit_conflict_resolutions
  for update using (false) with check (false);

drop policy if exists audit_conflict_resolutions_no_delete on public.audit_conflict_resolutions;
create policy audit_conflict_resolutions_no_delete on public.audit_conflict_resolutions
  for delete using (false);

