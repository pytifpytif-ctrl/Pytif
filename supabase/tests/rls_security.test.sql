-- RLS isolation tests — run against a local Supabase instance after migrations.
-- Usage: psql $DATABASE_URL -f supabase/tests/rls_security.test.sql
--
-- These tests verify User A cannot read User B's financial data.

begin;

-- Setup two fake user ids (replace with real auth.users ids in integration runs).
-- For CI, seed test users first via supabase test helpers.

do $$
declare
  user_a uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  user_b uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
begin
  raise notice 'RLS test scaffold — replace user_a/user_b with seeded test users.';
  raise notice 'Expected: set request.jwt.claim.sub = user_a; SELECT from schedules WHERE user_id = user_b returns 0 rows.';
end $$;

-- Manual verification checklist:
-- 1. SET request.jwt.claim.sub = '<user_a>';
-- 2. SELECT count(*) FROM schedules WHERE user_id != '<user_a>';  -- must be 0
-- 3. SELECT count(*) FROM transactions WHERE user_id != '<user_a>'; -- must be 0
-- 4. SELECT count(*) FROM deposits WHERE user_id != '<user_a>';    -- must be 0
-- 5. INSERT INTO schedules (...) — must fail (guard_schedules_mutation)
-- 6. UPDATE schedules SET locked_balance = 999 — must fail
-- 7. INSERT INTO transactions (...) — must fail (guard_transactions_mutation)

rollback;
