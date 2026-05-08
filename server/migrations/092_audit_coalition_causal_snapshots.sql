-- Causal DAG snapshots for Collaborative Director Protocol cross-domain dependencies.

create table if not exists public.audit_coalition_causal_snapshots (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  schema_version integer not null default 1,
  snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_coalition_causal_snapshots_audit_created
  on public.audit_coalition_causal_snapshots(audit_id, created_at desc);

alter table public.audit_coalition_causal_snapshots enable row level security;

drop policy if exists "Users can read own audit coalition causal snapshots" on public.audit_coalition_causal_snapshots;
create policy "Users can read own audit coalition causal snapshots"
  on public.audit_coalition_causal_snapshots for select
  using (
    exists (
      select 1
      from public.audits a
      where a.id = audit_id
        and (a.user_id = auth.uid() or a.client_id = auth.uid())
    )
  );

drop policy if exists "Service role can manage audit coalition causal snapshots" on public.audit_coalition_causal_snapshots;
create policy "Service role can manage audit coalition causal snapshots"
  on public.audit_coalition_causal_snapshots for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
