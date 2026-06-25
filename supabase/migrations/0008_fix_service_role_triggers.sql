-- Fix guard triggers: service-role edge functions must bypass checks.
-- auth.role() is reliable; request.jwt.claim.role is not always set for service role.

create or replace function public.guard_users_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
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

create or replace function public.guard_schedules_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
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

create or replace function public.guard_send_slots_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Send slots are immutable';
end;
$$;
