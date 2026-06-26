-- Jiokoe — add funds to an existing ACTIVE schedule (top-up deposits).

alter table public.deposits
  add column if not exists deposit_type text not null default 'initial',
  add column if not exists topup_sends jsonb;

-- Apply a confirmed top-up: insert future sends and increase locked balance.
create or replace function public.apply_schedule_topup(p_deposit_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  dep public.deposits%rowtype;
  s   public.schedules%rowtype;
  item jsonb;
  d   date;
  st  time;
  amt int;
  lbl text;
  sched timestamptz;
begin
  select * into dep from public.deposits where id = p_deposit_id for update;
  if not found then raise exception 'deposit not found'; end if;
  if dep.deposit_type <> 'topup' then raise exception 'not a top-up deposit'; end if;
  if dep.status <> 'CONFIRMED' then raise exception 'deposit not confirmed'; end if;

  select * into s from public.schedules where id = dep.schedule_id for update;
  if not found then raise exception 'schedule not found'; end if;
  if s.status <> 'ACTIVE' then raise exception 'Schedule is not active'; end if;

  for item in select * from jsonb_array_elements(coalesce(dep.topup_sends, '[]'::jsonb))
  loop
    d := (item->>'date')::date;
    st := (item->>'send_time')::time;
    amt := (item->>'amount')::int;
    lbl := coalesce(nullif(item->>'label', ''), 'Top-up');
    if amt is null or amt <= 0 then
      raise exception 'Invalid top-up amount';
    end if;
    sched := ((d + st) at time zone 'Africa/Nairobi');
    if sched <= now() then
      raise exception 'Each added send must be scheduled in the future';
    end if;
    insert into public.transactions(
      schedule_id, slot_id, user_id, label, amount, fee, status, scheduled_for
    )
    values (
      s.id, null, s.user_id, lbl, amt, public.send_fee(amt), 'PENDING', sched
    );
  end loop;

  update public.schedules
  set locked_balance = locked_balance + dep.amount,
      total_deposited = total_deposited + dep.amount
  where id = s.id;
end;
$$;

revoke all on function public.apply_schedule_topup(uuid) from public;
grant execute on function public.apply_schedule_topup(uuid) to service_role;
