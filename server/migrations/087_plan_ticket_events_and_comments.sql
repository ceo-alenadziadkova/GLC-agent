-- Stage 2 collaboration + audit trail for plan board tickets.

create table if not exists public.plan_ticket_events (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  card_id uuid not null references public.plan_task_delivery(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  source_surface text not null default 'board',
  action text not null,
  field_changes jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_plan_ticket_events_audit_card_created_at
  on public.plan_ticket_events(audit_id, card_id, created_at desc);

create table if not exists public.plan_ticket_comments (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid not null references public.audits(id) on delete cascade,
  card_id uuid not null references public.plan_task_delivery(id) on delete cascade,
  author_user_id uuid references public.profiles(id) on delete set null,
  body text not null check (char_length(body) between 1 and 4000),
  mentions text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plan_ticket_comments_audit_card_created_at
  on public.plan_ticket_comments(audit_id, card_id, created_at asc);
