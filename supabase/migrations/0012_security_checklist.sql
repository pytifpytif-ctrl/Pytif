-- Pytif / Jiokoe — Security Implementation Checklist v1.0 (June 2026)
-- Financial integrity, callback idempotency, immutability, reconciliation.

-- ---------- Callback audit log (90-day retention — purge via cron) ----------
create table if not exists public.mpesa_callback_log (
  id             uuid primary key default gen_random_uuid(),
  callback_type  text not null,
  ip_address     text,
  payload        jsonb not null default '{}',
  accepted       boolean not null default false,
  reject_reason  text,
  created_at     timestamptz not null default now()
);
create index if not exists idx_mpesa_cb_created on public.mpesa_callback_log(created_at desc);
alter table public.mpesa_callback_log enable row level security;

-- ---------- OTP lockout tracking ----------
alter table public.users
  add column if not exists otp_failed_count integer not null default 0,
  add column if not exists otp_locked_until timestamptz;

-- ---------- Financial constraints ----------
alter table public.schedules
  drop constraint if exists chk_schedules_locked_balance_nonneg;
alter table public.schedules
  add constraint chk_schedules_locked_balance_nonneg check (locked_balance >= 0);

alter table public.transactions
  drop constraint if exists chk_txn_amount_range;
alter table public.transactions
  add constraint chk_txn_amount_range check (amount >= 1 and amount <= 70000);

alter table public.send_slots
  drop constraint if exists chk_slot_amount_range;
alter table public.send_slots
  add constraint chk_slot_amount_range check (amount >= 1 and amount <= 70000);

alter table public.deposits
  drop constraint if exists chk_deposit_amount_positive;
alter table public.deposits
  add constraint chk_deposit_amount_positive check (amount >= 1);

-- ---------- Idempotent M-Pesa receipts ----------
create unique index if not exists uq_deposits_mpesa_receipt
  on public.deposits (mpesa_reference)
  where mpesa_reference is not null and status = 'CONFIRMED';

create unique index if not exists uq_txn_settlement_receipt
  on public.transactions (mpesa_reference)
  where mpesa_reference is not null and status = 'SUCCESS';

-- ---------- Guard deposits (service role only writes) ----------
create or replace function public.guard_deposits_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Deposits are managed by the server';
end;
$$;

drop trigger if exists guard_deposits_mutation on public.deposits;
create trigger guard_deposits_mutation
  before insert or update or delete on public.deposits
  for each row execute function public.guard_deposits_mutation();

-- ---------- Guard transactions (immutable log; service role only) ----------
create or replace function public.guard_transactions_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Transactions are immutable';
end;
$$;

drop trigger if exists guard_transactions_mutation on public.transactions;
create trigger guard_transactions_mutation
  before insert or update or delete on public.transactions
  for each row execute function public.guard_transactions_mutation();

-- ---------- mark_send_success: balance check inside transaction + duplicate receipt ----------
create or replace function public.mark_send_success(p_txn_id uuid, p_mpesa_ref text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  t public.transactions%rowtype;
  bal integer;
begin
  if p_mpesa_ref is null or length(trim(p_mpesa_ref)) = 0 then
    raise exception 'Missing M-Pesa receipt';
  end if;

  if exists (
    select 1 from public.deposits
    where mpesa_reference = p_mpesa_ref and status = 'CONFIRMED'
  ) then
    raise exception 'Duplicate M-Pesa receipt (deposit)';
  end if;

  if exists (
    select 1 from public.transactions
    where mpesa_reference = p_mpesa_ref and status = 'SUCCESS' and id <> p_txn_id
  ) then
    raise exception 'Duplicate M-Pesa receipt (transaction)';
  end if;

  select * into t from public.transactions where id = p_txn_id for update;
  if not found or t.status = 'SUCCESS' then return; end if;

  select locked_balance into bal
  from public.schedules
  where id = t.schedule_id
  for update;

  if bal is null or bal < t.amount then
    raise exception 'Insufficient locked balance at settlement';
  end if;

  update public.transactions
    set status = 'SUCCESS', mpesa_reference = p_mpesa_ref, sent_at = now(), failure_reason = null
    where id = p_txn_id;

  update public.schedules
    set locked_balance = greatest(0, locked_balance - t.amount)
    where id = t.schedule_id;

  perform public.refresh_schedule_progress(t.schedule_id);
end;
$$;

revoke execute on function public.mark_send_success(uuid, text) from public, anon, authenticated;
grant execute on function public.mark_send_success(uuid, text) to service_role;

-- ---------- Scheduler: cap amount + balance re-read ----------
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
      and t.amount >= 1 and t.amount <= 70000
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

-- ---------- Daily balance reconciliation ----------
create or replace function public.reconcile_locked_balances()
returns table (
  schedule_id uuid,
  locked_balance integer,
  pending_debits integer,
  expected_minimum integer,
  discrepancy integer
)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.locked_balance,
    coalesce(sum(t.amount) filter (
      where t.status in ('PENDING', 'PENDING_B2C_CONFIRM')
    ), 0)::integer as pending_debits,
    coalesce(sum(t.amount) filter (
      where t.status in ('PENDING', 'PENDING_B2C_CONFIRM')
    ), 0)::integer as expected_minimum,
    (s.locked_balance - coalesce(sum(t.amount) filter (
      where t.status in ('PENDING', 'PENDING_B2C_CONFIRM')
    ), 0))::integer as discrepancy
  from public.schedules s
  left join public.transactions t on t.schedule_id = s.id
  where s.status = 'ACTIVE'
  group by s.id, s.locked_balance
  having s.locked_balance < coalesce(sum(t.amount) filter (
    where t.status in ('PENDING', 'PENDING_B2C_CONFIRM')
  ), 0);
$$;

revoke execute on function public.reconcile_locked_balances() from public, anon, authenticated;
grant execute on function public.reconcile_locked_balances() to service_role;

-- ---------- Purge old callback logs (>90 days) — run via pg_cron weekly ----------
create or replace function public.purge_old_callback_logs()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare n integer;
begin
  delete from public.mpesa_callback_log where created_at < now() - interval '90 days';
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke execute on function public.purge_old_callback_logs() from public, anon, authenticated;
grant execute on function public.purge_old_callback_logs() to service_role;
