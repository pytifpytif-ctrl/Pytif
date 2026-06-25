-- Pytif — security hardening
-- Tighter RLS, immutable financial fields, RPC lockdown, audit log, rate limits.

-- ---------- Audit log (service role only) ----------
create table if not exists public.security_audit_log (
  id          uuid primary key default gen_random_uuid(),
  event_type  text not null,
  actor_id    uuid,
  ip_address  text,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index if not exists idx_audit_created on public.security_audit_log(created_at desc);
create index if not exists idx_audit_type on public.security_audit_log(event_type);
alter table public.security_audit_log enable row level security;

-- ---------- Rate limiting (service role only) ----------
create table if not exists public.rate_limits (
  key           text primary key,
  count         integer not null default 1,
  window_start  timestamptz not null default now()
);
alter table public.rate_limits enable row level security;

create or replace function public.check_rate_limit(
  p_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.rate_limits%rowtype;
begin
  select * into r from public.rate_limits where key = p_key for update;
  if not found then
    insert into public.rate_limits (key, count, window_start) values (p_key, 1, now());
    return true;
  end if;
  if r.window_start + make_interval(secs => p_window_seconds) < now() then
    update public.rate_limits set count = 1, window_start = now() where key = p_key;
    return true;
  end if;
  if r.count >= p_max then
    return false;
  end if;
  update public.rate_limits set count = r.count + 1 where key = p_key;
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------- Guard sensitive user fields ----------
create or replace function public.guard_users_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if new.is_verified then
      raise exception 'Cannot create a pre-verified profile';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.is_verified is distinct from old.is_verified then
      raise exception 'Verification status is managed by the server';
    end if;
    if new.mpesa_number is distinct from old.mpesa_number and old.is_verified then
      raise exception 'Verified M-Pesa number can only be changed via OTP';
    end if;
    return new;
  end if;

  return old;
end;
$$;

drop trigger if exists guard_users_mutation on public.users;
create trigger guard_users_mutation
  before insert or update on public.users
  for each row execute function public.guard_users_mutation();

-- ---------- Guard schedule financial fields ----------
create or replace function public.guard_schedules_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    raise exception 'Schedules must be created via the server';
  end if;

  if tg_op = 'UPDATE' then
    if new.status is distinct from old.status then
      raise exception 'Cannot modify schedule status';
    end if;
    if new.locked_balance is distinct from old.locked_balance then
      raise exception 'Cannot modify locked balance';
    end if;
    if new.total_deposited is distinct from old.total_deposited then
      raise exception 'Cannot modify deposited amount';
    end if;
    if new.total_days is distinct from old.total_days then
      raise exception 'Cannot modify schedule duration';
    end if;
    if new.days_completed is distinct from old.days_completed then
      raise exception 'Cannot modify schedule progress';
    end if;
    if new.destination_mpesa is distinct from old.destination_mpesa then
      raise exception 'Cannot modify payout number';
    end if;
    if new.pattern is distinct from old.pattern
       or new.active_days is distinct from old.active_days
       or new.active_dates is distinct from old.active_dates
       or new.start_date is distinct from old.start_date
       or new.end_date is distinct from old.end_date then
      raise exception 'Cannot modify schedule pattern or dates';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'Cannot delete schedules';
  end if;

  return old;
end;
$$;

drop trigger if exists guard_schedules_mutation on public.schedules;
create trigger guard_schedules_mutation
  before insert or update or delete on public.schedules
  for each row execute function public.guard_schedules_mutation();

-- ---------- Guard send slots (immutable after creation) ----------
create or replace function public.guard_send_slots_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Send slots are immutable';
end;
$$;

drop trigger if exists guard_send_slots_mutation on public.send_slots;
create trigger guard_send_slots_mutation
  before insert or update or delete on public.send_slots
  for each row execute function public.guard_send_slots_mutation();

-- ---------- Replace overly permissive RLS ----------
drop policy if exists users_self on public.users;
drop policy if exists users_select_self on public.users;
drop policy if exists users_update_self on public.users;
drop policy if exists users_insert_self on public.users;

create policy users_select_self on public.users
  for select using (auth.uid() = id);

create policy users_insert_self on public.users
  for insert with check (auth.uid() = id and is_verified = false);

create policy users_update_self on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists schedules_owner on public.schedules;
drop policy if exists schedules_select on public.schedules;
drop policy if exists schedules_update on public.schedules;

create policy schedules_select on public.schedules
  for select using (auth.uid() = user_id);

create policy schedules_update on public.schedules
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists slots_owner on public.send_slots;
drop policy if exists slots_select on public.send_slots;

create policy slots_select on public.send_slots
  for select using (
    exists (
      select 1 from public.schedules s
      where s.id = schedule_id and s.user_id = auth.uid()
    )
  );

-- ---------- Lock down privileged RPCs ----------
revoke execute on function public.activate_schedule(uuid) from public, anon, authenticated;
revoke execute on function public.mark_send_success(uuid, text) from public, anon, authenticated;
revoke execute on function public.mark_send_failed(uuid, text) from public, anon, authenticated;
revoke execute on function public.process_due_sends() from public, anon, authenticated;
revoke execute on function public.refresh_schedule_progress(uuid) from public, anon, authenticated;
revoke execute on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;

grant execute on function public.activate_schedule(uuid) to service_role;
grant execute on function public.mark_send_success(uuid, text) to service_role;
grant execute on function public.mark_send_failed(uuid, text) to service_role;
grant execute on function public.process_due_sends() to service_role;
grant execute on function public.refresh_schedule_progress(uuid) to service_role;
