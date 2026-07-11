-- Scheduler runtime config for hosted Supabase (database GUCs are not settable via CLI).
-- Service role key is stored in Supabase Vault — run scripts/setup-scheduler-vault.sql once.

create schema if not exists private;

create table if not exists private.scheduler_config (
  key text primary key,
  value text not null
);

revoke all on private.scheduler_config from public, anon, authenticated;
grant select on private.scheduler_config to service_role;

insert into private.scheduler_config (key, value) values
  ('b2c_dispatch_url', 'https://tdknmsuhonampjcfpsbu.supabase.co/functions/v1/b2c-send')
on conflict (key) do update set value = excluded.value;

create or replace function public.process_due_sends()
returns integer
language plpgsql
security definer set search_path = public, extensions, private, vault
as $$
declare
  r            record;
  fired        int := 0;
  fn_url       text;
  svc_key      text;
begin
  select value into fn_url
  from private.scheduler_config
  where key = 'b2c_dispatch_url';

  if fn_url is null or fn_url = '' then
    fn_url := current_setting('app.b2c_dispatch_url', true);
  end if;

  select decrypted_secret into svc_key
  from vault.decrypted_secrets
  where name = 'jiokoe_service_role_key'
  limit 1;

  if svc_key is null or svc_key = '' then
    svc_key := current_setting('app.service_role_key', true);
  end if;

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
    update public.transactions
      set status = 'PENDING_B2C_CONFIRM', sent_at = now()
    where id = r.id and status = 'PENDING';

    if fn_url is not null and coalesce(svc_key, '') <> '' then
      perform net.http_post(
        url := fn_url,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || svc_key
        ),
        body := jsonb_build_object('transaction_id', r.id)
      );
    end if;

    fired := fired + 1;
  end loop;

  return fired;
end;
$$;

revoke execute on function public.process_due_sends() from public, anon, authenticated;
grant execute on function public.process_due_sends() to service_role;
