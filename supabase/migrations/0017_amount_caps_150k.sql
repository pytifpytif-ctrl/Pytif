-- Align DB amount caps with production B2C limit (Ksh 150,000 per send).

alter table public.transactions
  drop constraint if exists chk_txn_amount_range;
alter table public.transactions
  add constraint chk_txn_amount_range check (amount >= 1 and amount <= 150000);

alter table public.send_slots
  drop constraint if exists chk_slot_amount_range;
alter table public.send_slots
  add constraint chk_slot_amount_range check (amount >= 1 and amount <= 150000);

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
      and t.scheduled_for > now() - interval '2 minutes'
      and t.amount >= 1 and t.amount <= 150000
      and s.locked_balance >= t.amount
    for update of t skip locked
  loop
    update public.transactions set status = 'PENDING_B2C_CONFIRM', sent_at = now()
    where id = r.id and status = 'PENDING';

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

comment on function public.process_due_sends() is
  'Dispatches due PENDING transactions to b2c-send. Max single send Ksh 150,000.';
