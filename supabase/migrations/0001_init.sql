-- Wastel — Phase 1 schema
-- Postgres / Supabase. All money columns are integer KES. All times are EAT (UTC+3)
-- in intent; timestamps are stored as timestamptz and compared against EAT below.

create extension if not exists "pgcrypto";

-- ---------- Enums ----------
do $$ begin
  create type schedule_pattern as enum ('EVERY_DAY', 'SPECIFIC_DAYS', 'CUSTOM_DATES');
exception when duplicate_object then null; end $$;

do $$ begin
  create type schedule_status as enum ('ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  -- PENDING -> queued. PENDING_B2C_CONFIRM -> B2C fired, awaiting result callback.
  create type txn_status as enum ('PENDING', 'PENDING_B2C_CONFIRM', 'SUCCESS', 'FAILED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type deposit_status as enum ('PENDING', 'CONFIRMED', 'FAILED');
exception when duplicate_object then null; end $$;

-- ---------- Users ----------
-- Profile row keyed to auth.users.id. The Mpesa number is the login identifier
-- (mapped to a synthetic email inside Supabase Auth by the frontend).
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null,
  mpesa_number  text unique not null,
  is_verified   boolean not null default false,
  created_at    timestamptz not null default now()
);

-- ---------- Schedules ----------
create table if not exists public.schedules (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.users(id) on delete cascade,
  name                   text not null,
  pattern                schedule_pattern not null,
  active_days            int[] default '{}',      -- ISO weekdays 1..7 (SPECIFIC_DAYS)
  active_dates           date[] default '{}',     -- exact dates (CUSTOM_DATES)
  start_date             date,
  end_date               date,
  total_days             integer not null default 0,
  days_completed         integer not null default 0,
  locked_balance         integer not null default 0,
  total_deposited        integer not null default 0,
  destination_mpesa      text not null,
  status                 schedule_status not null default 'PAUSED',
  recycled_from          uuid references public.schedules(id) on delete set null,
  cancellation_requested boolean not null default false,
  created_at             timestamptz not null default now()
);
create index if not exists idx_schedules_user on public.schedules(user_id);
create index if not exists idx_schedules_status on public.schedules(status);

-- ---------- Send slots ----------
create table if not exists public.send_slots (
  id           uuid primary key default gen_random_uuid(),
  schedule_id  uuid not null references public.schedules(id) on delete cascade,
  label        text default '',
  send_time    time not null,
  amount       integer not null,
  fee          integer not null default 0,
  is_active    boolean not null default true
);
create index if not exists idx_slots_schedule on public.send_slots(schedule_id);

-- ---------- Transactions ----------
-- One row per slot per active day. Pre-generated at activation.
create table if not exists public.transactions (
  id              uuid primary key default gen_random_uuid(),
  schedule_id     uuid not null references public.schedules(id) on delete cascade,
  slot_id         uuid references public.send_slots(id) on delete set null,
  user_id         uuid not null references public.users(id) on delete cascade,
  label           text default '',
  amount          integer not null,
  fee             integer not null default 0,
  mpesa_reference text,
  status          txn_status not null default 'PENDING',
  scheduled_for   timestamptz not null,
  sent_at         timestamptz,
  failure_reason  text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_txns_schedule on public.transactions(schedule_id);
create index if not exists idx_txns_user on public.transactions(user_id);
-- The scheduler's hot path: find PENDING rows that are due.
create index if not exists idx_txns_due on public.transactions(status, scheduled_for);

-- ---------- Deposits ----------
create table if not exists public.deposits (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.users(id) on delete cascade,
  schedule_id     uuid not null references public.schedules(id) on delete cascade,
  amount          integer not null,
  mpesa_reference text,
  checkout_request_id text,           -- Daraja CheckoutRequestID for STK reconciliation
  status          deposit_status not null default 'PENDING',
  created_at      timestamptz not null default now()
);
create index if not exists idx_deposits_schedule on public.deposits(schedule_id);
create index if not exists idx_deposits_checkout on public.deposits(checkout_request_id);

-- ---------- Profile trigger ----------
-- Auto-create a public.users row whenever an auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, mpesa_number, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Wastel user'),
    coalesce(new.raw_user_meta_data->>'mpesa_number', new.email),
    true
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.users         enable row level security;
alter table public.schedules     enable row level security;
alter table public.send_slots    enable row level security;
alter table public.transactions  enable row level security;
alter table public.deposits      enable row level security;

-- Users: a user can read/update only their own profile.
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Schedules: owner-only.
drop policy if exists schedules_owner on public.schedules;
create policy schedules_owner on public.schedules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Send slots: accessible if you own the parent schedule.
drop policy if exists slots_owner on public.send_slots;
create policy slots_owner on public.send_slots
  for all using (
    exists (select 1 from public.schedules s where s.id = schedule_id and s.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.schedules s where s.id = schedule_id and s.user_id = auth.uid())
  );

-- Transactions: read-only for the owner (writes happen via service role / functions).
drop policy if exists txns_owner_select on public.transactions;
create policy txns_owner_select on public.transactions
  for select using (auth.uid() = user_id);

-- Deposits: read-only for the owner.
drop policy if exists deposits_owner_select on public.deposits;
create policy deposits_owner_select on public.deposits
  for select using (auth.uid() = user_id);

-- NOTE: the Daraja edge functions and the pg_cron scheduler use the service role
-- key, which bypasses RLS, to write transactions/deposits and move balances.
