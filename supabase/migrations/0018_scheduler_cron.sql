-- Production scheduler: pg_cron + pg_net + Jiokoe jobs.
-- Requires Supabase Dashboard → Database → Extensions: enable pg_cron and pg_net first if this fails.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Idempotent: remove prior Jiokoe cron jobs if re-applied.
do $$
declare
  r record;
begin
  for r in select jobid from cron.job where jobname in (
    'jiokoe-sends', 'jiokoe-reconcile', 'jiokoe-purge-callback-logs',
    'wastel-sends'
  ) loop
    perform cron.unschedule(r.jobid);
  end loop;
exception
  when undefined_table then
    raise notice 'cron.job not available — enable pg_cron in Supabase Dashboard → Database → Extensions';
end;
$$;

-- Dispatch due sends every minute (UTC).
select cron.schedule(
  'jiokoe-sends',
  '* * * * *',
  $$ select public.process_due_sends(); $$
);

-- Daily reconciliation at midnight UTC (~3 AM EAT).
select cron.schedule(
  'jiokoe-reconcile',
  '0 0 * * *',
  $$ select * from public.reconcile_locked_balances(); $$
);

-- Purge callback logs older than 90 days — weekly Sunday 1 AM UTC.
select cron.schedule(
  'jiokoe-purge-callback-logs',
  '0 1 * * 0',
  $$ select public.purge_old_callback_logs(); $$
);

comment on extension pg_cron is 'Jiokoe scheduled sends and reconciliation';
