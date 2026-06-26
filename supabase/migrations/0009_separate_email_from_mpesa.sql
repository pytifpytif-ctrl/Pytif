-- Jiokoe — stop using auth email as a stand-in M-Pesa number.
-- mpesa_number stays NOT NULL + UNIQUE; unverified users get a per-user placeholder.

create or replace function public.pending_mpesa_placeholder(user_id uuid)
returns text
language sql
immutable
as $$
  select 'pending:' || user_id::text;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, mpesa_number, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Jiokoe user'),
    coalesce(
      nullif(new.raw_user_meta_data->>'mpesa_number', ''),
      public.pending_mpesa_placeholder(new.id)
    ),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Accounts that still have an email address stored as mpesa_number were never phone-verified.
update public.users
set mpesa_number = public.pending_mpesa_placeholder(id)
where is_verified = false
  and mpesa_number like '%@%';
