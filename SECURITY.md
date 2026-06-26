# Jiokoe / Pytif Security

**Version 1.0 | June 2026 | CONFIDENTIAL**

Jiokoe handles real customer money. This document maps the [Pytif Security Implementation Checklist v1.0] to what is implemented in this repository and what must be configured in production.

## Architecture

| Layer | Technology | Trust boundary |
|-------|------------|----------------|
| Frontend | React SPA (Vercel / Render) | Public; anon key + user JWT only |
| Auth | Supabase Auth | Email/OAuth sessions |
| Data | Postgres + RLS | Row-level isolation per user |
| Payments | Edge Functions + Daraja | Service role only for money movement |
| Scheduler | pg_cron + pg_net | Internal HTTP to `b2c-send` |

**Never** put `SUPABASE_SERVICE_ROLE_KEY` or Daraja secrets in the frontend.

---

## Checklist mapping

Legend: **DONE** = implemented in code | **CONFIG** = requires dashboard/env setup | **N/A** = not applicable to this stack | **GAP** = documented limitation

### 1. Authentication & session

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| OTP expiry 5 min | **DONE** | `send-otp` — 5-minute `expires_at` |
| OTP 6 digits | **DONE** | `otp.ts` `generateCode()` |
| OTP brute force lock 30 min / 5 fails | **DONE** | `verify-otp` + `users.otp_locked_until` (0012) |
| OTP rate limit 3/phone/10 min | **DONE** | `send-otp` `enforceRateLimit` |
| OTP SMS only | **DONE** | Africa's Talking via `_shared/sms.ts` |
| OTP single use | **DONE** | Consumed on first verify attempt |
| OTP not in URL | **DONE** | POST body only |
| httpOnly cookies for JWT | **GAP** | Supabase JS client uses secure browser storage; enable Supabase Auth hardening + short JWT expiry in dashboard |
| JWT 15 min / refresh 7 days | **CONFIG** | Supabase Dashboard → Auth → JWT expiry |
| RS256 signing | **CONFIG** | Managed by Supabase Auth |
| Logout invalidates refresh server-side | **CONFIG** | Supabase `signOut()` revokes refresh token |
| bcrypt cost 12 | **CONFIG** | Supabase Auth password hashing |
| Login rate limit 5/min/IP | **CONFIG** | Enable Supabase Auth rate limits + WAF |
| HaveIBeenPwned | **CONFIG** | Enable leaked password protection in Supabase Dashboard |
| Account enumeration prevention | **CONFIG** | Supabase Auth generic errors |

Primary M-Pesa verification uses **double-entry confirmation** (`confirm-mpesa`) rather than SMS OTP for onboarding; SMS OTP remains available via `send-otp` / `verify-otp`.

### 2. Daraja / M-Pesa

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Callback IP whitelist | **DONE** | `MPESA_CALLBACK_IP_ALLOWLIST` in `_shared/security.ts` |
| Callback shared secret | **DONE** | `INTERNAL_WEBHOOK_SECRET` header check |
| Idempotent receipts | **DONE** | Unique indexes + duplicate checks in `stk-callback`, `mark_send_success` (0012) |
| Replay prevention (5 min) | **DONE** | `isCallbackTooOld()` on STK/B2C callbacks |
| Callback logging 90 days | **DONE** | `mpesa_callback_log` + `purge_old_callback_logs()` |
| Amount validation | **DONE** | STK amount match; B2C amount match |
| Phone validation (PartyA) | **DONE** | STK callback compares payer to user profile |
| Credentials in env only | **DONE** | `.env.example`; never committed |
| OAuth token in memory | **DONE** | `_shared/daraja.ts` in-memory cache |
| Separate sandbox/production | **DONE** | `MPESA_ENV` |

Safaricom does not provide a standard HMAC on STK/B2C JSON callbacks; defense relies on **IP allowlist + webhook secret + idempotency + amount/phone validation**.

### 3. Database & Supabase

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| RLS on all tables | **DONE** | `0001_init.sql`, `0006_security_hardening.sql` |
| User isolation | **DONE** | `auth.uid() = user_id` policies |
| Service role isolation | **DONE** | Edge functions + scheduler only |
| No client financial writes | **DONE** | Triggers on schedules, deposits, transactions |
| Atomic balance ops | **DONE** | `mark_send_success` with `FOR UPDATE` (0012) |
| Double-spend prevention | **DONE** | Balance check inside transaction |
| Balance floor >= 0 | **DONE** | `chk_schedules_locked_balance_nonneg` (0012) |
| Immutable transaction log | **DONE** | `guard_transactions_mutation` (0012) |
| Amount cap Ksh 70,000 | **DONE** | DB constraints + `validateSendAmount` |
| Daily reconciliation | **DONE** | `reconcile_locked_balances()` — schedule via pg_cron |
| RLS automated tests | **DONE** | `supabase/tests/rls_security.test.sql` |

### 4. API & backend

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Rate limits (auth, schedules, top-up) | **DONE** | `check_rate_limit` + per-endpoint keys |
| M-Pesa phone regex 07/01 | **DONE** | `_shared/security.ts` |
| Amount integer 1–70,000 | **DONE** | `_shared/security.ts` |
| Schedule name max 50 chars | **DONE** | `sanitizeText` |
| Content-Type application/json | **DONE** | `requireJsonContentType` |
| Security headers | **DONE** | `cors.ts` (edge), `vercel.json` (frontend) |
| CORS restricted origin | **DONE** | `APP_URL` in `cors.ts` |
| Global 1000 req/min/IP | **CONFIG** | Supabase WAF / Cloudflare |

### 5. Frontend

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| No tokens in localStorage for custom auth | **GAP** | Supabase-managed session storage |
| No sensitive data in URL | **DONE** | Routes use path params only for IDs |
| XSS — no dangerouslySetInnerHTML | **DONE** | React default escaping |
| Mask M-Pesa in UI | **DONE** | `maskPhone()` — `07XX XXX 678` |
| Auto logout 10 min inactivity | **DONE** | `useInactivityLogout` in `AppLayout` |
| Strip console.log in production | **DONE** | `vite.config.js` esbuild drop |

### 6. Scheduler

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Service role only | **DONE** | `b2c-send` + `process_due_sends` RPC lockdown |
| Balance re-read before send | **DONE** | `b2c-send` + `mark_send_success` |
| No double sends | **DONE** | Status `PENDING` → `PENDING_B2C_CONFIRM` with row lock |
| Failed send — no auto retry | **DONE** | Marks FAILED; manual investigation |
| Max send Ksh 70,000 | **DONE** | DB + edge validation |
| Cron logging | **CONFIG** | Log `process_due_sends()` return value via pg_cron |

### 7. Infrastructure

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| npm audit on deploy | **DONE** | `npm run build` runs `audit:prod` |
| Dependabot | **DONE** | `.github/dependabot.yml` |
| Lock file committed | **DONE** | `package-lock.json` |
| git-secrets scan | **CONFIG** | Run before first push; see below |
| HTTPS everywhere | **CONFIG** | Vercel/Render + Supabase enforce TLS |

---

## Production secrets (Supabase Edge Functions)

Set via `supabase secrets set`:

```bash
SUPABASE_SERVICE_ROLE_KEY=...
MPESA_ENV=production
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_B2C_SECURITY_CREDENTIAL=...
INTERNAL_WEBHOOK_SECRET=<random 32+ bytes>
MPESA_CALLBACK_IP_ALLOWLIST=<safaricom IPs, comma-separated>
APP_URL=https://your-production-domain.com
```

Obtain Safaricom callback IP ranges from Safaricom Daraja support and update when they change.

---

## Deploy security update

```bash
supabase db push                                    # applies 0012_security_checklist.sql
supabase functions deploy                           # all edge functions
supabase secrets set APP_URL=... MPESA_CALLBACK_IP_ALLOWLIST=... INTERNAL_WEBHOOK_SECRET=...
npm run build                                       # includes npm audit
```

Redeploy frontend so `vercel.json` headers take effect.

### Daily reconciliation (pg_cron)

```sql
select cron.schedule(
  'jiokoe-reconcile',
  '0 3 * * *',
  $$ select * from public.reconcile_locked_balances(); $$
);
```

Alert if any row returned (locked balance less than pending debits).

### Callback log purge (weekly)

```sql
select cron.schedule(
  'jiokoe-purge-callback-logs',
  '0 4 * * 0',
  $$ select public.purge_old_callback_logs(); $$
);
```

---

## Pre-launch checklist

| Item | Owner |
|------|-------|
| External pen test or OWASP ZAP scan | Engineering |
| RLS tests run against staging | Engineering |
| Spoofed callback tests rejected | Engineering |
| Reconciliation cron scheduled | Ops |
| securityheaders.com → A or better | Ops |
| SSL Labs A+ | Ops |
| `npm audit` zero critical | CI |
| git-secrets scan passed | Engineering |
| Auth brute-force test | Engineering |
| Incident response runbook reviewed | Founder |
| Privacy policy published | Legal |

---

## Incident response (summary)

| Scenario | Immediate action |
|----------|------------------|
| Balance manipulation | Halt B2C sends; freeze affected accounts |
| Daraja credential compromise | Rotate via Safaricom portal; invalidate tokens |
| Database breach | Revoke Supabase keys; force logout all users |
| Fake callback detected | Reverse credits; audit last 24h callbacks |

---

## Reporting vulnerabilities

Email security issues privately to the project owner. Do not open public GitHub issues for exploitable bugs.
