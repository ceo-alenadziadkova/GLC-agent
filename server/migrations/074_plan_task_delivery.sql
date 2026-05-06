-- Operational soft state for Delivery Board (orchestration pack nodes + optional manual cards).

create table if not exists public.plan_task_delivery (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  canonical_node_key text,
  pack_graph_node_id text,
  pack_lane_snapshot text,
  source text not null check (source in ('pack', 'manual')),
  delivery_area text not null check (delivery_area in ('backlog', 'board', 'archived')),
  column_id text not null,
  position double precision not null default 0,
  pinned boolean not null default false,
  last_applied_pack_version integer,
  orphaned_reason text check (orphaned_reason in ('node_removed', 'lane_changed') or orphaned_reason is null),
  created_by_user_id uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plan_task_delivery_pack_key_nonempty check (
    (source = 'pack' and canonical_node_key is not null)
    or (source = 'manual' and canonical_node_key is null)
  )
);

create unique index if not exists ux_plan_task_delivery_audit_canonical
  on public.plan_task_delivery (audit_id, canonical_node_key)
  where source = 'pack';

create index if not exists ix_plan_task_delivery_audit_area_col_pos
  on public.plan_task_delivery (audit_id, delivery_area, column_id, position);

comment on table public.plan_task_delivery is
  'Audit-scoped delivery board operational state; does not mutate glc_orchestration_pack JSON.';

alter table public.plan_task_delivery enable row level security;

create policy plan_task_delivery_select_scoped on public.plan_task_delivery
  for select
  using (
    audit_id in (
      select id from public.audits
      where user_id = (select auth.uid()) or client_id = (select auth.uid())
    )
  );

create policy plan_task_delivery_insert_consultant on public.plan_task_delivery
  for insert
  with check (
    audit_id in (select id from public.audits where user_id = (select auth.uid()))
  );

create policy plan_task_delivery_update_consultant on public.plan_task_delivery
  for update
  using (
    audit_id in (select id from public.audits where user_id = (select auth.uid()))
  )
  with check (
    audit_id in (select id from public.audits where user_id = (select auth.uid()))
  );

create policy plan_task_delivery_delete_consultant on public.plan_task_delivery
  for delete
  using (
    audit_id in (select id from public.audits where user_id = (select auth.uid()))
  );
