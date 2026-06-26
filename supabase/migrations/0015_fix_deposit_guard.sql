-- Fix deposit/transaction guards blocked for edge functions (service role).
-- 0012 used request.jwt.claim.role, which is not set for the service-role client.
-- 0008 already fixed other guards with auth.role(); apply the same here.

create or replace function public.guard_deposits_mutation()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), '') = 'service_role' then
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
  if coalesce(auth.role(), '') = 'service_role' then
    return coalesce(new, old);
  end if;
  raise exception 'Transactions are immutable';
end;
$$;
