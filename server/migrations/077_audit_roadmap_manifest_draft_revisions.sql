-- Pending execution hints (lane / owner) from Delivery Board → merged into roadmap manifest snapshots (Epic 2.1-C).

create table if not exists public.audit_roadmap_manifest_draft_revisions (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  canonical_node_key text not null,
  requested_lane text
    constraint audit_roadmap_manifest_draft_lane_ok check (
      requested_lane is null
      or requested_lane in (
        'product_change',
        'tech_delivery',
        'marketing_narrative',
        'gtm_sales',
        'seo',
        'research',
        'processes_automation',
        'risk_compliance'
      )
    ),
  owner_hint text,
  expected_pack_version_at_enqueue integer not null,
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ux_audit_roadmap_manifest_draft_audit_key unique (audit_id, canonical_node_key),
  constraint audit_roadmap_manifest_draft_has_signal check (
    requested_lane is not null
    or (owner_hint is not null and trim(owner_hint) <> '')
  )
);

create index if not exists ix_audit_roadmap_manifest_draft_audit
  on public.audit_roadmap_manifest_draft_revisions (audit_id);

comment on table public.audit_roadmap_manifest_draft_revisions is
  'Consultant-origin draft execution overrides (lane/owner hints) queued from Delivery Board until merged into a signed roadmap manifest snapshot.';

alter table public.audit_roadmap_manifest_draft_revisions enable row level security;

create policy audit_roadmap_manifest_draft_select on public.audit_roadmap_manifest_draft_revisions
  for select
  using (
    audit_id in (
      select id from public.audits
      where user_id = (select auth.uid()) or client_id = (select auth.uid())
    )
  );

create policy audit_roadmap_manifest_draft_write_consultant on public.audit_roadmap_manifest_draft_revisions
  for all
  using (
    audit_id in (select id from public.audits where user_id = (select auth.uid()))
  )
  with check (
    audit_id in (select id from public.audits where user_id = (select auth.uid()))
    and created_by_user_id = (select auth.uid())
  );
