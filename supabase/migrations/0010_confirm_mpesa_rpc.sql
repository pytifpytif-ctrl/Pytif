-- Jiokoe — confirm M-Pesa via double entry (Postgres RPC, no SMS / edge function required).

create or replace function public.normalize_ke_phone(raw text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  d := regexp_replace(coalesce(raw, ''), '\D', '', 'g');
  if d like '254%' then
    d := '0' || substring(d from 4);
  end if;
  if length(d) = 9 and d like '7%' then
    d := '0' || d;
  end if;
  return d;
end;
$$;

create or replace function public.confirm_mpesa_number(p_phone text, p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_phone := public.normalize_ke_phone(p_phone);
  if v_phone !~ '^0[0-9]{9}$' then
    raise exception 'Enter a valid Safaricom number, e.g. 0712345678';
  end if;
  if public.normalize_ke_phone(p_confirm) <> v_phone then
    raise exception 'Numbers do not match. Check and try again.';
  end if;
  if exists (
    select 1
    from public.users
    where mpesa_number = v_phone
      and is_verified = true
      and id <> v_uid
  ) then
    raise exception 'That M-Pesa number is already linked to another account.';
  end if;

  select coalesce(
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'full_name',
    'Jiokoe user'
  )
  into v_name
  from auth.users u
  where u.id = v_uid;

  perform set_config('app.confirm_mpesa', '1', true);

  insert into public.users (id, name, mpesa_number, is_verified)
  values (v_uid, v_name, v_phone, true)
  on conflict (id) do update
    set name = excluded.name,
        mpesa_number = excluded.mpesa_number,
        is_verified = true;

  perform set_config('app.confirm_mpesa', '', true);

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.confirm_mpesa_number(text, text) from public;
grant execute on function public.confirm_mpesa_number(text, text) to authenticated;

-- Let the RPC set is_verified + mpesa_number (still blocks direct client updates).
create or replace function public.guard_users_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
    return coalesce(new, old);
  end if;

  if coalesce(current_setting('app.confirm_mpesa', true), '') = '1' then
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
      raise exception 'Verified M-Pesa number can only be changed via confirmation';
    end if;
    return new;
  end if;

  return old;
end;
$$;
