-- Extend Delivery Board operational cards with Jira/Linear-like ticket metadata.

alter table public.plan_task_delivery
  add column if not exists ticket_description text,
  add column if not exists assignee text,
  add column if not exists priority text check (priority in ('low', 'medium', 'high', 'urgent') or priority is null),
  add column if not exists start_date date,
  add column if not exists due_date date,
  add column if not exists end_date date;

alter table public.plan_task_delivery
  drop constraint if exists plan_task_delivery_due_after_start_check;

alter table public.plan_task_delivery
  add constraint plan_task_delivery_due_after_start_check
  check (
    start_date is null
    or due_date is null
    or due_date >= start_date
  );
