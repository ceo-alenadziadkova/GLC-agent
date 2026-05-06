-- Platform admin top-ups for audit token budget.
--
-- Records every top-up operation in `audit_token_budget_grants` (audit log)
-- and updates `audits.token_budget` atomically through the
-- `apply_audit_token_budget_topup` RPC. Service role only — public/client
-- API roles must not bypass the platform-admin guard in
-- `server/src/routes/audits/controllers/patch-audit-token-budget.controller.ts`.

create table if not exists public.audit_token_budget_grants (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  granted_by_user_id uuid not null references public.profiles(id) on delete restrict,
  delta_tokens integer not null check (delta_tokens > 0),
  previous_budget integer not null check (previous_budget >= 0),
  new_budget integer not null check (new_budget >= 0),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists ix_audit_token_budget_grants_audit_created
  on public.audit_token_budget_grants (audit_id, created_at desc);

create index if not exists ix_audit_token_budget_grants_granted_by
  on public.audit_token_budget_grants (granted_by_user_id);

comment on table public.audit_token_budget_grants is
  'Platform-admin audit log of token-budget top-ups; mirrors deltas applied to audits.token_budget via apply_audit_token_budget_topup().';

alter table public.audit_token_budget_grants enable row level security;

-- Backend-only table: explicit deny for API roles (defense in depth — service role still bypasses RLS).
drop policy if exists audit_token_budget_grants_deny_client_access on public.audit_token_budget_grants;
create policy audit_token_budget_grants_deny_client_access
  on public.audit_token_budget_grants for all
  using (false)
  with check (false);

-- Atomic top-up: locks the audits row, increments token_budget, inserts grant entry,
-- and returns the previous/new budget plus current tokens_used in a single transaction.
create or replace function public.apply_audit_token_budget_topup(
  p_audit_id uuid,
  p_granted_by uuid,
  p_delta integer,
  p_reason text
)
returns table (
  grant_id uuid,
  previous_budget integer,
  new_budget integer,
  tokens_used integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev integer;
  v_new integer;
  v_tokens_used integer;
  v_grant_id uuid;
begin
  if p_delta is null or p_delta <= 0 then
    raise exception 'delta_must_be_positive' using errcode = '22023';
  end if;

  select a.token_budget, a.tokens_used
    into v_prev, v_tokens_used
    from public.audits a
   where a.id = p_audit_id
   for update;

  if not found then
    raise exception 'audit_not_found' using errcode = 'P0002';
  end if;

  v_new := v_prev + p_delta;

  update public.audits
     set token_budget = v_new
   where id = p_audit_id;

  insert into public.audit_token_budget_grants (
    audit_id, granted_by_user_id, delta_tokens, previous_budget, new_budget, reason
  )
  values (p_audit_id, p_granted_by, p_delta, v_prev, v_new, nullif(btrim(p_reason), ''))
  returning id into v_grant_id;

  grant_id := v_grant_id;
  previous_budget := v_prev;
  new_budget := v_new;
  tokens_used := v_tokens_used;
  return next;
end;
$$;

revoke all on function public.apply_audit_token_budget_topup(uuid, uuid, integer, text) from public;
grant execute on function public.apply_audit_token_budget_topup(uuid, uuid, integer, text) to service_role;

comment on function public.apply_audit_token_budget_topup(uuid, uuid, integer, text) is
  'Platform-admin only: increments audits.token_budget by p_delta and records the grant. Locks the audits row to avoid lost updates.';
