-- Run once in Supabase Dashboard → SQL Editor if STK / create-schedule fails with
-- "Deposits are managed by the server".

create or replace function public.guard_deposits_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Deposits are managed by the server';
end;
$$;

create or replace function public.guard_transactions_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Transactions are immutable';
end;
$$;
