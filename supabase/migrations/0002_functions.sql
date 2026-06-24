-- Wastel — fees, activation, transaction pre-generation, and the scheduler.

-- ---------- Fee helpers ----------
-- Mpesa B2C standard fee bands (verify current rates before launch).
create or replace function public.mpesa_fee(amount integer)
returns integer language sql immutable as $$
  select case
    when amount <= 0     then 0
    when amount <= 100   then 0
    when amount <= 500   then 11
    when amount <= 1000  then 15
    when amount <= 1500  then 27
    when amount <= 2500  then 29
    when amount <= 3500  then 52
    when amount <= 5000  then 69
    when amount <= 7500  then 87
    else 115
  end;
$$;

-- Wastel charges a flat Ksh 5 per send on top of the Mpesa fee.
create or replace function public.send_fee(amount integer)
returns integer language sql immutable as $$
  select case when amount > 0 then public.mpesa_fee(amount) + 5 else 0 end;
$$;

-- ---------- EAT helper ----------
-- All scheduling is reasoned about in EAT (UTC+3). pg_cron runs in UTC.
create or replace function public.now_eat()
returns timestamp language sql stable as $$
  select (now() at time zone 'Africa/Nairobi');
$$;

-- ---------- Activate schedule + pre-generate transactions ----------
-- Called after a deposit is CONFIRMED. Expands the slots across every active
-- day and inserts one PENDING transaction per slot per day.
create or replace function public.activate_schedule(p_schedule_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  s            public.schedules%rowtype;
  d            date;
  slot         public.send_slots%rowtype;
  iso_dow      int;
begin
  select * into s from public.schedules where id = p_schedule_id for update;
  if not found then raise exception 'schedule % not found', p_schedule_id; end if;

  -- Avoid double-generation.
  if exists (select 1 from public.transactions where schedule_id = p_schedule_id) then
    return;
  end if;

  if s.pattern = 'CUSTOM_DATES' then
    foreach d in array s.active_dates loop
      for slot in select * from public.send_slots where schedule_id = s.id and is_active loop
        insert into public.transactions(schedule_id, slot_id, user_id, label, amount, fee, status, scheduled_for)
        values (s.id, slot.id, s.user_id, slot.label, slot.amount, slot.fee, 'PENDING',
                ((d + slot.send_time) at time zone 'Africa/Nairobi'));
      end loop;
    end loop;
  else
    d := s.start_date;
    while d <= s.end_date loop
      iso_dow := extract(isodow from d);  -- 1=Mon..7=Sun
      if s.pattern = 'EVERY_DAY' or iso_dow = any(s.active_days) then
        for slot in select * from public.send_slots where schedule_id = s.id and is_active loop
          insert into public.transactions(schedule_id, slot_id, user_id, label, amount, fee, status, scheduled_for)
          values (s.id, slot.id, s.user_id, slot.label, slot.amount, slot.fee, 'PENDING',
                  ((d + slot.send_time) at time zone 'Africa/Nairobi'));
        end loop;
      end if;
      d := d + 1;
    end loop;
  end if;

  update public.schedules set status = 'ACTIVE' where id = p_schedule_id;
end;
$$;

-- ---------- Mark a successful B2C send ----------
-- Called from the b2c-result edge function. Idempotent on the transaction.
create or replace function public.mark_send_success(p_txn_id uuid, p_mpesa_ref text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare t public.transactions%rowtype;
begin
  select * into t from public.transactions where id = p_txn_id for update;
  if not found or t.status = 'SUCCESS' then return; end if;

  update public.transactions
    set status = 'SUCCESS', mpesa_reference = p_mpesa_ref, sent_at = now(), failure_reason = null
    where id = p_txn_id;

  update public.schedules
    set locked_balance = greatest(0, locked_balance - t.amount)
    where id = t.schedule_id;

  perform public.refresh_schedule_progress(t.schedule_id);
end;
$$;

-- ---------- Mark a failed B2C send ----------
create or replace function public.mark_send_failed(p_txn_id uuid, p_reason text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare t public.transactions%rowtype;
begin
  select * into t from public.transactions where id = p_txn_id for update;
  if not found or t.status = 'SUCCESS' then return; end if;

  update public.transactions
    set status = 'FAILED', sent_at = now(), failure_reason = p_reason
    where id = p_txn_id;

  perform public.refresh_schedule_progress(t.schedule_id);
end;
$$;

-- ---------- Recompute days_completed + completion ----------
create or replace function public.refresh_schedule_progress(p_schedule_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  completed_days int;
  remaining      int;
begin
  -- A day is "completed" when none of its transactions are still PENDING-ish.
  select count(*) into completed_days from (
    select (scheduled_for at time zone 'Africa/Nairobi')::date as d
    from public.transactions
    where schedule_id = p_schedule_id
    group by 1
    having bool_and(status in ('SUCCESS','FAILED'))
  ) x;

  update public.schedules set days_completed = completed_days where id = p_schedule_id;

  select count(*) into remaining from public.transactions
  where schedule_id = p_schedule_id and status in ('PENDING','PENDING_B2C_CONFIRM');

  if remaining = 0 then
    update public.schedules set status = 'COMPLETED'
    where id = p_schedule_id and status = 'ACTIVE';
  end if;
end;
$$;

-- ---------- The scheduler ----------
-- Selects due PENDING transactions, marks them PENDING_B2C_CONFIRM, and asks an
-- edge function to fire the actual Daraja B2C call (pg_net). The result/timeout
-- callbacks then settle each transaction via mark_send_success / mark_send_failed.
create or replace function public.process_due_sends()
returns integer
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  r            record;
  fired        int := 0;
  fn_url       text := current_setting('app.b2c_dispatch_url', true);
  svc_key      text := current_setting('app.service_role_key', true);
begin
  for r in
    select t.*
    from public.transactions t
    join public.schedules s on s.id = t.schedule_id
    where t.status = 'PENDING'
      and s.status = 'ACTIVE'
      and t.scheduled_for <= now()
      -- 2-minute window prevents double-firing if cron runs slightly late.
      and t.scheduled_for > now() - interval '2 minutes'
      and s.locked_balance >= t.amount
    for update skip locked
  loop
    update public.transactions set status = 'PENDING_B2C_CONFIRM', sent_at = now()
    where id = r.id;

    -- Dispatch the B2C call asynchronously (requires the pg_net extension and
    -- the GUCs app.b2c_dispatch_url / app.service_role_key to be set).
    if fn_url is not null then
      perform net.http_post(
        url := fn_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || coalesce(svc_key, '')
        ),
        body := jsonb_build_object('transaction_id', r.id)
      );
    end if;

    fired := fired + 1;
  end loop;

  return fired;
end;
$$;

-- ---------- Schedule the cron (every minute) ----------
-- Requires: create extension if not exists pg_cron;  (run as a superuser/owner)
-- and the pg_net extension for outbound HTTP from process_due_sends().
--
--   create extension if not exists pg_cron;
--   create extension if not exists pg_net;
--   alter database postgres set app.b2c_dispatch_url = 'https://<ref>.functions.supabase.co/b2c-send';
--   alter database postgres set app.service_role_key = '<service-role-key>';
--
-- select cron.schedule('wastel-sends', '* * * * *', $$ select public.process_due_sends(); $$);
