-- Last persisted orchestration pack revision diff (vN→vN+1), JSON validated in app (Zod).

alter table public.audit_strategy
  add column if not exists glc_orchestration_last_revision_diff jsonb;

comment on column public.audit_strategy.glc_orchestration_last_revision_diff is
  'Structured diff from previous glc_orchestration_pack to current (null when first version or unreadable prior).';
