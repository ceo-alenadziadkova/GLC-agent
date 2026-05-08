-- Stage 1 foundation for Jira/Linear-like board ticket editing.
-- Adds normalized issue fields and a transactional batch patch RPC.

alter table public.plan_task_delivery
  add column if not exists assignee_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists labels text[] not null default '{}',
  add column if not exists story_points numeric(6,2),
  add column if not exists updated_by_user_id uuid references public.profiles(id) on delete set null;

alter table public.plan_task_delivery
  drop constraint if exists plan_task_delivery_end_after_start_check;

alter table public.plan_task_delivery
  add constraint plan_task_delivery_end_after_start_check
  check (
    start_date is null
    or end_date is null
    or end_date >= start_date
  );

alter table public.plan_task_delivery
  drop constraint if exists plan_task_delivery_end_after_due_check;

alter table public.plan_task_delivery
  add constraint plan_task_delivery_end_after_due_check
  check (
    due_date is null
    or end_date is null
    or end_date >= due_date
  );

create or replace function public.plan_board_batch_patch_cards(
  p_audit_id uuid,
  p_updated_by_user_id uuid,
  p_patches jsonb
)
returns table(card_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_card_id uuid;
  v_labels text[];
begin
  if p_patches is null or jsonb_typeof(p_patches) <> 'array' then
    raise exception 'invalid_patches_payload';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_patches)
  loop
    v_card_id := nullif(v_item->>'card_id', '')::uuid;
    if v_card_id is null then
      raise exception 'invalid_card_id';
    end if;

    if (v_item ? 'labels') then
      if jsonb_typeof(v_item->'labels') <> 'array' then
        raise exception 'labels_must_be_array';
      end if;
      select coalesce(array_agg(trim(x)), '{}')
      into v_labels
      from jsonb_array_elements_text(v_item->'labels') x
      where trim(x) <> '';
    else
      v_labels := null;
    end if;

    update public.plan_task_delivery
    set
      column_id = case when v_item ? 'to_column' then nullif(v_item->>'to_column', '') else column_id end,
      position = case when v_item ? 'position' then (v_item->>'position')::double precision else position end,
      pinned = case when v_item ? 'pinned' then (v_item->>'pinned')::boolean else pinned end,
      delivery_area = case when v_item ? 'delivery_area' then nullif(v_item->>'delivery_area', '') else delivery_area end,
      manual_title = case when v_item ? 'title' then nullif(v_item->>'title', '') else manual_title end,
      pack_lane_snapshot = case when v_item ? 'lane' then nullif(v_item->>'lane', '') else pack_lane_snapshot end,
      ticket_description = case when v_item ? 'ticket_description' then nullif(v_item->>'ticket_description', '') else ticket_description end,
      assignee = case when v_item ? 'assignee' then nullif(v_item->>'assignee', '') else assignee end,
      assignee_user_id = case when v_item ? 'assignee_user_id' then nullif(v_item->>'assignee_user_id', '')::uuid else assignee_user_id end,
      labels = case when v_item ? 'labels' then coalesce(v_labels, '{}') else labels end,
      story_points = case when v_item ? 'story_points' then nullif(v_item->>'story_points', '')::numeric else story_points end,
      priority = case when v_item ? 'priority' then nullif(v_item->>'priority', '') else priority end,
      start_date = case when v_item ? 'start_date' then nullif(v_item->>'start_date', '')::date else start_date end,
      due_date = case when v_item ? 'due_date' then nullif(v_item->>'due_date', '')::date else due_date end,
      end_date = case when v_item ? 'end_date' then nullif(v_item->>'end_date', '')::date else end_date end,
      updated_by_user_id = p_updated_by_user_id,
      updated_at = now()
    where audit_id = p_audit_id
      and id = v_card_id;

    if not found then
      raise exception 'card_not_found:%', v_card_id;
    end if;

    card_id := v_card_id;
    return next;
  end loop;
end;
$$;

grant execute on function public.plan_board_batch_patch_cards(uuid, uuid, jsonb) to authenticated;
