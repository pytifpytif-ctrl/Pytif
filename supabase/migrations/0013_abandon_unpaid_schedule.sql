-- Drop unpaid schedule drafts (PAUSED, never funded). Used when STK fails or is cancelled.

create or replace function public.abandon_unpaid_schedule(p_schedule_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.schedules%rowtype;
begin
  select * into s from public.schedules where id = p_schedule_id for update;
  if not found then
    return false;
  end if;

  if s.status <> 'PAUSED'::schedule_status then
    return false;
  end if;

  if coalesce(s.total_deposited, 0) > 0 or coalesce(s.locked_balance, 0) > 0 then
    return false;
  end if;

  if exists (
    select 1
    from public.deposits d
    where d.schedule_id = p_schedule_id
      and d.status = 'CONFIRMED'::deposit_status
  ) then
    return false;
  end if;

  if exists (
    select 1
    from public.deposits d
    where d.schedule_id = p_schedule_id
      and coalesce(d.deposit_type, 'initial') = 'topup'
  ) then
    return false;
  end if;

  delete from public.schedules where id = p_schedule_id;
  return true;
end;
$$;

revoke all on function public.abandon_unpaid_schedule(uuid) from public, anon, authenticated;
grant execute on function public.abandon_unpaid_schedule(uuid) to service_role;

-- Remove existing unpaid drafts (migration runs as superuser; bypass guard trigger briefly).
alter table public.schedules disable trigger guard_schedules_mutation;

delete from public.schedules s
where s.status = 'PAUSED'::schedule_status
  and coalesce(s.total_deposited, 0) = 0
  and coalesce(s.locked_balance, 0) = 0
  and not exists (
    select 1
    from public.deposits d
    where d.schedule_id = s.id
      and d.status = 'CONFIRMED'::deposit_status
  );

alter table public.schedules enable trigger guard_schedules_mutation;
