-- Public `/brief` session flow (no-auth lead intake with resumable token).
create table if not exists public_brief_sessions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  consultant_id uuid null references profiles(id) on delete set null,
  submitted_at timestamptz null,
  converted_at timestamptz null,
  converted_audit_id uuid null references audits(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'converted', 'expired')),
  contact_name text not null default '',
  contact_company text not null default '',
  has_website boolean not null default false,
  website_url text null,
  contact_email text null,
  contact_phone text null,
  responses jsonb not null default '{}'::jsonb,
  intake_versions jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_public_brief_sessions_status_submitted
  on public_brief_sessions (status, submitted_at desc);

create index if not exists idx_public_brief_sessions_consultant
  on public_brief_sessions (consultant_id, submitted_at desc);

create or replace function set_public_brief_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_public_brief_sessions_updated_at on public_brief_sessions;
create trigger trg_public_brief_sessions_updated_at
before update on public_brief_sessions
for each row execute function set_public_brief_sessions_updated_at();

alter table public_brief_sessions enable row level security;

drop policy if exists public_brief_sessions_no_select on public_brief_sessions;
create policy public_brief_sessions_no_select on public_brief_sessions
  for select using (false);

drop policy if exists public_brief_sessions_no_insert on public_brief_sessions;
create policy public_brief_sessions_no_insert on public_brief_sessions
  for insert with check (false);

drop policy if exists public_brief_sessions_no_update on public_brief_sessions;
create policy public_brief_sessions_no_update on public_brief_sessions
  for update using (false) with check (false);

drop policy if exists public_brief_sessions_no_delete on public_brief_sessions;
create policy public_brief_sessions_no_delete on public_brief_sessions
  for delete using (false);
