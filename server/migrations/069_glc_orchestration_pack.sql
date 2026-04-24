-- GLC Orchestrator persisted pack + roadmap manifest snapshots (ADR-GLC-ORCHESTRATOR-V1.1, ADR client roadmap).

alter table public.audit_strategy
  add column if not exists glc_orchestration_pack jsonb;

alter table public.audit_strategy
  add column if not exists orchestration_pack_version integer not null default 0;

comment on column public.audit_strategy.glc_orchestration_pack is
  'Validated glc_orchestration_pack JSON (cross-domain graph, lanes, critical path).';

comment on column public.audit_strategy.orchestration_pack_version is
  'Increments when a new orchestration pack is persisted for this audit.';

create table if not exists public.audit_roadmap_manifest_snapshots (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits (id) on delete cascade,
  created_by_user_id uuid not null references auth.users (id) on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_roadmap_manifest_snapshots_audit_id
  on public.audit_roadmap_manifest_snapshots (audit_id);

create index if not exists idx_audit_roadmap_manifest_snapshots_created_at
  on public.audit_roadmap_manifest_snapshots (audit_id, created_at desc);

comment on table public.audit_roadmap_manifest_snapshots is
  'Immutable roadmap input manifest snapshots (coverage, scenario, season); referenced by glc_orchestration_pack.manifest_snapshot_id.';
