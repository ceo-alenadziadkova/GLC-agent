-- Persist optional display title for manual delivery-board cards (pack rows derive title from the graph).

alter table public.plan_task_delivery
  add column if not exists manual_title text;

comment on column public.plan_task_delivery.manual_title is
  'User-facing title for source=manual cards; pack-backed cards derive title from glc_orchestration_pack.graph.';
