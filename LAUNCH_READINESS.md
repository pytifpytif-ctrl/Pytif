# Jiokoe — Launch Readiness Checklist

**Version 1.0 | July 2026**

Use this before going live and before Play Store / App Store submission.  
**Goal:** swap sandbox keys → production keys, run final tests, submit to stores.

---

## Executive summary

| Area | Code ready? | You must configure |
|------|-------------|-------------------|
| M-Pesa STK + B2C | ✅ Yes | Production Daraja credentials |
| Fee engine | ✅ Yes | Customer Bouquet on Paybill |
| Security (RLS, callbacks, audit) | ✅ Yes | IP allowlist + Supabase Auth hardening |
| Web hosting | ✅ Yes | Vercel domain + env vars |
| Android app shell | ✅ Yes | Android Studio + signed AAB |
| iOS app shell | ✅ Yes | Mac + Xcode + Apple Developer |
| Store compliance | ⚠️ Partial | Policies, screenshots, accounts |

---

## 1. M-Pesa / Daraja — code vs keys

### Implemented in code ✅

| Flow | Edge function | What it does |
|------|---------------|--------------|
| Deposit STK | `create-schedule`, `add-funds` | Exact fee total → STK push |
| STK callback | `stk-callback` | Amount + phone match, idempotent receipt, activate schedule |
| Scheduled send | `b2c-send` | Service-role only, balance pre-check |
| B2C result | `b2c-result` | Success/fail settlement, no double deduct |
| B2C timeout | `b2c-timeout` | Marks FAILED on queue timeout |
| M-Pesa verify | `confirm-mpesa` | Double-entry phone confirmation |
| Fees | `_shared/fees.ts` | June 2026 Safaricom bands + Ksh 10/day |

### Swap at go-live (Supabase secrets)

```bash
supabase secrets set \
  MPESA_ENV=production \
  MPESA_CONSUMER_KEY=<prod> \
  MPESA_CONSUMER_SECRET=<prod> \
  MPESA_SHORTCODE=<paybill> \
  MPESA_PASSKEY=<prod> \
  MPESA_B2C_SHORTCODE=<b2c shortcode> \
  MPESA_B2C_INITIATOR_NAME=<initiator> \
  MPESA_B2C_SECURITY_CREDENTIAL=<encrypted password> \
  MPESA_STK_CALLBACK_URL=https://<ref>.supabase.co/functions/v1/stk-callback \
  MPESA_B2C_RESULT_URL=https://<ref>.supabase.co/functions/v1/b2c-result \
  MPESA_B2C_QUEUE_TIMEOUT_URL=https://<ref>.supabase.co/functions/v1/b2c-timeout \
  MPESA_CALLBACK_IP_ALLOWLIST=<safaricom IPs, comma-separated> \
  APP_URL=https://jiokoe.com
```

### Safaricom portal (not code)

- [ ] Production app approved on [developer.safaricom.co.ke](https://developer.safaricom.co.ke)
- [ ] Paybill/Till registered with **Customer Bouquet** (user pays exact amount, Jiokoe absorbs deposit fee)
- [ ] B2C service enabled on float account
- [ ] Callback URLs registered in Daraja portal (must match secrets above)
- [ ] Obtain **production callback IP ranges** from Safaricom support → set `MPESA_CALLBACK_IP_ALLOWLIST`

> **Important:** Safaricom callbacks cannot send custom headers. Production relies on **IP allowlist**, not `INTERNAL_WEBHOOK_SECRET`.

### End-to-end M-Pesa test (sandbox now, production before launch)

1. Create schedule → STK prompt for exact `total_to_collect`
2. Enter PIN → `stk-callback` confirms → schedule ACTIVE
3. Wait for cron → `b2c-send` fires → money arrives on M-Pesa
4. Check `transactions.status = SUCCESS`, `locked_balance` reduced correctly
5. Test failed STK (cancel prompt) → deposit FAILED, schedule abandoned
6. Test top-up on active schedule

---

## 2. Security — code vs dashboard config

### Implemented ✅

| Control | Where |
|---------|--------|
| Row Level Security (all tables) | `0001_init.sql`, `0006` |
| No client writes to money tables | DB triggers |
| Rate limits (schedule, top-up, OTP) | Edge functions |
| STK amount + payer phone validation | `stk-callback` |
| B2C amount validation | `b2c-result` |
| Duplicate receipt rejection | Unique indexes `0012` |
| Callback replay window (5 min) | `isCallbackTooOld()` |
| Callback audit log (90 days) | `mpesa_callback_log` |
| Immutable transaction log | `guard_transactions_mutation` |
| Atomic balance updates | `mark_send_success` FOR UPDATE |
| CORS restricted to `APP_URL` | `_shared/cors.ts` |
| Security headers (CSP, HSTS) | `vercel.json` |
| Phone masking in UI | `maskPhone()` |
| Inactivity logout (10 min) | `useInactivityLogout` |
| App passcode + biometric (native) | `AppPasscodeGate`, `BiometricSetup` |
| Background re-lock (native) | `AppPasscodeGate` |
| `npm audit` on build | `package.json` |
| Android backup disabled | `AndroidManifest.xml` |

### Configure in Supabase Dashboard before launch

- [ ] **Auth → JWT expiry** — 15 min access / 7 day refresh (recommended)
- [ ] **Auth → Leaked password protection** — enable
- [ ] **Auth → Rate limits** — enable
- [ ] **Database → pg_cron** — scheduler + reconciliation jobs (see below)

### Apply pending migrations

```bash
supabase db push   # includes 0016 production fees, 0017 amount caps 150k
```

Verify:

```sql
select public.mpesa_fee(280);   -- 7
select public.mpesa_fee(2501);  -- 53
```

### Schedule these SQL jobs (once per environment)

```sql
-- Sends every minute
select cron.schedule('jiokoe-sends', '* * * * *', $$ select public.process_due_sends(); $$);

-- Daily reconciliation at 3 AM EAT (midnight UTC)
select cron.schedule('jiokoe-reconcile', '0 0 * * *', $$ select * from public.reconcile_locked_balances(); $$);

-- Weekly callback log purge
select cron.schedule('jiokoe-purge-callback-logs', '0 1 * * 0', $$ select public.purge_old_callback_logs(); $$);
```

Also set scheduler auth (hosted Supabase uses Vault, not database GUCs):

```sql
-- After migration 0019, run once (or use scripts/setup-scheduler-vault.sql):
select vault.create_secret(
  '<service-role-key>',
  'jiokoe_service_role_key',
  'Bearer token for pg_cron process_due_sends'
);
```

Legacy GUCs (optional if you have superuser SQL Editor access):

```sql
alter database postgres set app.b2c_dispatch_url = 'https://<ref>.supabase.co/functions/v1/b2c-send';
alter database postgres set app.service_role_key = '<service-role-key>';
```

### Known gaps (acceptable for v1, document)

| Gap | Risk | Mitigation |
|-----|------|------------|
| Float balance pre-check before B2C batch | Low at pilot scale | Manual float monitoring; add alert later |
| B2C auto-split >150k at send time | None in v1 | Max slot capped at 150k |
| Certificate pinning (native) | Medium | Add in v1.1 if required by audit |
| External pen test | Required before scale | Schedule before marketing push |

---

## 3. Web — Vercel production

### Frontend env vars (Vercel dashboard)

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Never put `SUPABASE_SERVICE_ROLE_KEY` or Daraja secrets in Vercel.

### Checklist

- [ ] Custom domain (e.g. `jiokoe.com`) pointed to Vercel
- [ ] HTTPS enforced (automatic on Vercel)
- [ ] `npm run build` passes (`audit:prod` + PWA icons)
- [ ] Privacy policy live at `https://jiokoe.com/privacy`
- [ ] Terms live at `https://jiokoe.com/terms`
- [ ] Test security headers: [securityheaders.com](https://securityheaders.com)

---

## 4. Google Play Store

### App technical ✅

| Item | Status |
|------|--------|
| Package ID `com.jiokoe.app` | ✅ |
| Capacitor + plugins synced | ✅ |
| Biometric permission | ✅ `USE_BIOMETRIC` |
| Backup disabled (wallet security) | ✅ |
| Cleartext traffic disabled | ✅ |
| Portrait orientation | ✅ |

### You must complete in Play Console

- [ ] Google Play Developer account ($25 one-time)
- [ ] **App category:** Finance
- [ ] **Privacy policy URL:** `https://jiokoe.com/privacy`
- [ ] **Data safety form** — declare:
  - Email, name, M-Pesa number (collected)
  - Financial info (schedule amounts — not stored card data)
  - Data encrypted in transit (HTTPS)
  - Users can request deletion (see Privacy policy)
- [ ] **Target audience** — 18+ recommended for financial apps
- [ ] **Signed AAB** — Android Studio → Build → Generate Signed Bundle
- [ ] Upload to **Internal testing** track first
- [ ] Add test users → install → full M-Pesa sandbox flow
- [ ] Promote to **Closed testing** → then **Production**

### Play Store — M-Pesa note

Jiokoe does **not** use Google Play Billing. Deposits go through Safaricom STK on the user's phone. Declare external payment for wallet top-up in the financial app questionnaire if asked.

---

## 5. Apple App Store

### App technical ✅

| Item | Status |
|------|--------|
| Bundle ID `com.jiokoe.app` | ✅ (set Team in Xcode) |
| Face ID usage string | ✅ `NSFaceIDUsageDescription` |
| Portrait iPhone | ✅ |
| Capacitor iOS project | ✅ |

### You must complete in App Store Connect

- [ ] Apple Developer Program ($99/year)
- [ ] Create app record — Bundle ID `com.jiokoe.app`
- [ ] **Privacy policy URL:** `https://jiokoe.com/privacy`
- [ ] **App Privacy** nutrition labels (match Play data safety)
- [ ] **Age rating** — likely 17+ (financial services)
- [ ] **Review notes:** explain M-Pesa STK is external Safaricom UI, not IAP
- [ ] Screenshots (6.7" + 5.5" iPhone required)
- [ ] Archive in Xcode → Upload to TestFlight
- [ ] Internal TestFlight → full flow test → submit for review

### Apple guideline 3.1 (payments)

Jiokoe sends money **to the user's own M-Pesa** on a pre-authorized schedule. This is not digital content IAP. In review notes, state:

> "Users fund their commitment wallet via Safaricom M-Pesa STK Push (external payment). Jiokoe does not sell digital goods through the app."

---

## 6. Kenya regulatory (non-code)

- [ ] Company registration (Jiokoe Limited — per Terms)
- [ ] KRA PIN / tax compliance
- [ ] **ODPC** (Data Protection Act) — registration if processing personal data at scale
- [ ] Legal review: commitment wallet positioning vs deposit-taking / CBK licensing
- [ ] Safaricom partner / Paybill agreement documentation

---

## 7. Go-live day sequence

```
1. supabase db push                          # all migrations
2. supabase functions deploy                 # all edge functions
3. supabase secrets set ...                  # production Daraja + IP allowlist + APP_URL
4. Schedule pg_cron jobs + DB GUCs            # SQL above
5. Vercel: production env vars + deploy
6. npm run build:mobile                      # sync native apps
7. Signed AAB → Play Internal testing
8. TestFlight → iOS internal test
9. End-to-end: register → verify M-Pesa → schedule → STK → receive send
10. Promote stores after 48h clean testing
```

---

## 8. Quick verification commands

```bash
# Fee engine
npm run test:fees

# Production build (web + native sync)
npm run build:mobile

# SQL checks (Supabase SQL editor)
select public.mpesa_fee(280);
select * from public.reconcile_locked_balances();
```

---

## 9. Status legend for this doc

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented in repository |
| ⚠️ | Partially done — action required |
| 🔑 | Swap keys / configure secrets only |
| 📋 | Manual store / legal step |

---

*When going live you change keys and URLs — the architecture is ready.*
