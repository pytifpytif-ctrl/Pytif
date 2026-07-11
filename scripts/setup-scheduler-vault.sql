-- One-time setup: store service role key in Vault for pg_cron → b2c-send auth.
-- Run from project root AFTER migrations 0019 are applied:
--
--   npx supabase db query --linked -f scripts/setup-scheduler-vault.sql
--
-- Or paste in Supabase Dashboard → SQL Editor.
-- Replace YOUR_SERVICE_ROLE_KEY with the value from Supabase Dashboard → Settings → API.

select vault.create_secret(
  'YOUR_SERVICE_ROLE_KEY',
  'jiokoe_service_role_key',
  'Bearer token for pg_cron process_due_sends → b2c-send'
);

-- Verify (should return one row, secret redacted in UI):
select name, description, created_at
from vault.secrets
where name = 'jiokoe_service_role_key';
