# Pytif Security

Pytif handles real money. No system is 100% unpenetrable, but this document describes what is implemented in code and what you must configure in production.

## Architecture

| Layer | Technology | Trust boundary |
|-------|------------|----------------|
| Frontend | React SPA (Vercel) | Public; only anon key + user JWT |
| Auth | Supabase Auth | Email/OAuth sessions |
| Data | Postgres + RLS | Row-level isolation per user |
| Payments | Edge Functions + Daraja | Service role only for money movement |
| Scheduler | pg_cron + pg_net | Internal HTTP to `b2c-send` |

**Never** put `SUPABASE_SERVICE_ROLE_KEY`, Daraja secrets, or SMS keys in the frontend.

---

## Implemented controls (code)

### Database (`0006_security_hardening.sql`)

- **RLS**: Users read/update own profile; schedules read-only for financial fields; send slots read-only; transactions/deposits read-only.
- **Triggers**: Block client changes to `is_verified`, verified `mpesa_number`, `locked_balance`, schedule `status`, slot amounts, etc.
- **RPC lockdown**: `activate_schedule`, `mark_send_*`, `process_due_sends` executable only by `service_role`.
- **Audit log**: `security_audit_log` table (service role only).
- **Rate limits**: `check_rate_limit()` for OTP and abuse prevention.

### Edge functions

| Function | Protection |
|----------|------------|
| `create-schedule` | JWT required; verified M-Pesa only; payout = verified number |
| `send-otp` | JWT; rate limits per user/IP/phone; CSPRNG codes; no dev codes in production |
| `verify-otp` | JWT; 5 attempt cap; sets verified via service role |
| `b2c-send` | **Service role bearer required** |
| `stk-callback` | Amount must match deposit; idempotent confirm; audit log |
| `b2c-result` / `b2c-timeout` | State checks; amount verification; audit log |
| `reset-password` | **Disabled** — use email reset only |

### Frontend

- Security headers via `vercel.json` (CSP, HSTS, frame deny, nosniff).
- Profile onboarding no longer self-verifies M-Pesa (OTP required).
- Demo mock backend must not be used in production (`VITE_SUPABASE_*` must be set).

---

## Production checklist

### Supabase Dashboard

1. Run all migrations: `supabase db push`
2. Deploy edge functions: `supabase functions deploy`
3. Set edge secrets: service role, Daraja, Africa's Talking, `MPESA_ENV=production`
4. Enable ** leaked password protection** and ** MFA** for admin accounts
5. Restrict **Database** network if using Supabase Pro
6. Rotate service role key if ever exposed
7. Review **Auth** → URL configuration (allowed redirects only)

### M-Pesa / Daraja

1. Register callback URLs pointing to your Supabase functions
2. Use production credentials only on production project
3. Monitor Daraja transaction logs daily
4. Reconcile STK receipts against `deposits` table

### Infrastructure

1. **HTTPS only** (Vercel + Supabase enforce this)
2. **WAF** — enable on Vercel Pro or Cloudflare in front of app
3. **Supabase rate limiting** — enable in dashboard
4. **Alerts** — monitor failed logins, OTP spikes, B2C failures
5. **Backups** — enable PITR on Supabase Pro for financial data

### Secrets rotation

Rotate immediately if compromised:

- `SUPABASE_SERVICE_ROLE_KEY`
- `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_B2C_SECURITY_CREDENTIAL`
- `AT_API_KEY`
- `INTERNAL_WEBHOOK_SECRET`

---

## What attackers commonly try

| Attack | Mitigation |
|--------|------------|
| Forge STK callback | CheckoutRequestID must exist; amount must match deposit |
| Trigger B2C without cron | `b2c-send` requires service role |
| Inflate locked balance via API | Triggers block client writes to balance fields |
| Self-verify M-Pesa | `is_verified` only via `verify-otp` (service role) |
| OTP brute force | 5 attempts + rate limits |
| Reset password by phone | Endpoint disabled |
| SQL injection | Supabase parameterized queries + RLS |

---

## Reporting vulnerabilities

Email security issues privately to the project owner. Do not open public GitHub issues for exploitable bugs.

---

## Deploy security update

```bash
supabase db push
supabase functions deploy send-otp verify-otp create-schedule stk-callback b2c-send b2c-result b2c-timeout reset-password
```

Then redeploy the frontend so `vercel.json` headers take effect.
