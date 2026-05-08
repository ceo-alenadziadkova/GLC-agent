-- Collaborative Director Protocol (Foundation): per-domain hypothesis drafts.
-- Additive migration; safe for mixed rollout states.

create table if not exists public.audit_domain_hypotheses (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  domain_key text not null check (domain_key in (
    'tech_infrastructure',
    'security_compliance',
    'seo_digital',
    'ux_conversion',
    'marketing_utp',
    'automation_processes'
  )),
  schema_version integer not null default 1,
  draft jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (audit_id, domain_key)
);

create index if not exists idx_audit_domain_hypotheses_audit_id
  on public.audit_domain_hypotheses (audit_id);

create index if not exists idx_audit_domain_hypotheses_audit_domain
  on public.audit_domain_hypotheses (audit_id, domain_key);

comment on table public.audit_domain_hypotheses is
  'Collaborative protocol Phase 1 hypothesis drafts per audit and domain.';

alter table public.audit_domain_hypotheses enable row level security;

drop policy if exists audit_domain_hypotheses_no_select on public.audit_domain_hypotheses;
create policy audit_domain_hypotheses_no_select on public.audit_domain_hypotheses
  for select using (false);

drop policy if exists audit_domain_hypotheses_no_insert on public.audit_domain_hypotheses;
create policy audit_domain_hypotheses_no_insert on public.audit_domain_hypotheses
  for insert with check (false);

drop policy if exists audit_domain_hypotheses_no_update on public.audit_domain_hypotheses;
create policy audit_domain_hypotheses_no_update on public.audit_domain_hypotheses
  for update using (false) with check (false);

drop policy if exists audit_domain_hypotheses_no_delete on public.audit_domain_hypotheses;
create policy audit_domain_hypotheses_no_delete on public.audit_domain_hypotheses
  for delete using (false);

