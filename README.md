# Pytif — Commitment Wallet (MVP, Phase 1)

> Lock it. Forget it. Get it back on schedule.

Pytif is a web-based **commitment wallet**. You give Pytif your money, it holds
it, and returns it to you on a schedule you define in advance. Once committed,
the money **cannot be freely withdrawn** — that single constraint is the entire
product.

Unlike Mpesa Ratiba (date-only, cancellable) or savings apps (lock but don't
disburse), Pytif combines **time-of-day scheduled micro-disbursements** with a
**locked balance**. Set a 6:00 AM transport send, a 12:00 PM lunch send, and a
5:30 PM fare-home send — all from one locked deposit.

This repo is **Phase 1**: time-of-day scheduled sends **to self only**.

---

## ✨ What's built

- **Mobile-first PWA-style UI** (React + Vite + Tailwind) — a payment-calendar
  feel, not a form.
- **Schedule Builder** wizard: pattern → days/dates → time-slot timeline (with a
  scroll-wheel time picker) → duration → destination → full fee summary → STK
  push → success.
- **Dashboard** with total locked balance, today's send timeline, and schedule
  cards.
- **Schedule Detail** with progress, today's sends, daily template, full send
  history, and **Recycle** for completed schedules.
- **Transaction History** with status / schedule / date-range filters.
- **Auth**: register (with OTP step), login, forgot-password — keyed on the
  Mpesa number.
- **Fee engine** matching the published Mpesa B2C bands + flat Ksh 5 Pytif fee.
- **Full Supabase backend**: SQL schema + RLS, activation & scheduler functions,
  `pg_cron` every-minute job, and **Daraja edge functions** (STK push, B2C, and
  all three callbacks).

### Runs with zero setup
If no Supabase credentials are present, the app boots a **local in-browser
backend** (localStorage) that simulates the entire lifecycle — deposit → STK →
activation → pre-generated transactions → a live scheduler that "fires" sends
and deducts the locked balance. Use the **"Explore with a demo account"** button
on the login screen.

---

## 🚀 Quick start (local demo)

```bash
npm install
npm run dev
```

Open the printed URL, click **Explore with a demo account**, and build a
schedule. The scheduler ticks every few seconds, so back-dated/near-term sends
fire while you watch. (No real money, no Mpesa — everything is in your browser.)

To reset the demo data: clear the site's localStorage.

---

## 🧱 Tech stack

| Layer | Tech | Why |
| --- | --- | --- |
| Frontend | React + Vite | Fast, mobile-first, PWA-ready |
| Styling | Tailwind CSS | Rapid, consistent UI |
| Backend / DB | Supabase (Postgres, Auth) | Auth + Postgres + edge functions |
| Scheduler | Supabase `pg_cron` | Every-minute due-send job |
| Collect | Daraja STK Push (C2B) | Prompts the user to pay |
| Disburse | Daraja B2C | Sends from company Mpesa to user |
| SMS | Africa's Talking | Failed-send alerts |
| Hosting | Vercel (frontend) | Free tier is fine for MVP |

---

## 📁 Project structure

```
src/
  components/      Reusable UI (TimeWheel, MonthCalendar, layout, primitives)
  context/         AuthContext
  hooks/           useScheduler (drives the demo scheduler tick)
  lib/             fees, schedule math, formatting, api + backends
  pages/           Auth, Dashboard, ScheduleBuilder, ScheduleDetail, History
supabase/
  migrations/      0001_init.sql (schema + RLS), 0002_functions.sql (logic + cron)
  functions/       create-schedule, stk-callback, b2c-send, b2c-result, b2c-timeout
```

The UI is backend-agnostic: `src/lib/api.js` picks the Supabase backend when
`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are set, otherwise the mock.

---

## 🔌 Connecting the real backend (Supabase + Daraja)

### 1. Database
Create a Supabase project, then run the migrations (Supabase SQL editor or CLI):

```bash
supabase link --project-ref <your-ref>
supabase db push        # applies supabase/migrations
```

Enable the scheduler extensions and GUCs (run once, as the DB owner):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

alter database postgres set app.b2c_dispatch_url = 'https://<ref>.functions.supabase.co/b2c-send';
alter database postgres set app.service_role_key  = '<service-role-key>';

select cron.schedule('wastel-sends', '* * * * *', $$ select public.process_due_sends(); $$);
```

> **Timezone:** all sends are reasoned about in **EAT (UTC+3)**. `pg_cron` runs
> in UTC; the SQL converts active dates + slot times with
> `at time zone 'Africa/Nairobi'`, so a 6:00 AM EAT send fires at 03:00 UTC.

### 2. Edge functions
```bash
supabase functions deploy create-schedule
supabase functions deploy stk-callback
supabase functions deploy b2c-send
supabase functions deploy b2c-result
supabase functions deploy b2c-timeout
```

Set the secrets (from `.env.example`):

```bash
supabase secrets set \
  MPESA_ENV=sandbox \
  MPESA_CONSUMER_KEY=... MPESA_CONSUMER_SECRET=... \
  MPESA_SHORTCODE=... MPESA_PASSKEY=... \
  MPESA_B2C_INITIATOR_NAME=... MPESA_B2C_SECURITY_CREDENTIAL=... \
  MPESA_STK_CALLBACK_URL=https://<ref>.functions.supabase.co/stk-callback \
  MPESA_B2C_RESULT_URL=https://<ref>.functions.supabase.co/b2c-result \
  MPESA_B2C_QUEUE_TIMEOUT_URL=https://<ref>.functions.supabase.co/b2c-timeout \
  AT_API_KEY=... AT_USERNAME=...
```

### 3. Frontend
Put these in `.env` (or Vercel env vars) and rebuild:

```
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

> **Start on the Daraja sandbox.** Sandbox credentials are free and immediate at
> [developer.safaricom.co.ke](https://developer.safaricom.co.ke). No business
> registration needed to start building.

---

## 💸 Fee structure

All fees are calculated **upfront** and bundled into the deposit. Each send goes
out as the **clean amount** — no deductions at send time.

| Amount per send (KES) | Mpesa fee | Pytif fee | Total |
| --- | --- | --- | --- |
| 1 – 100 | 0 | 5 | 5 |
| 101 – 500 | 11 | 5 | 16 |
| 501 – 1,000 | 15 | 5 | 20 |
| 1,001 – 1,500 | 27 | 5 | 32 |
| 1,501 – 2,500 | 29 | 5 | 34 |
| 2,501 – 3,500 | 52 | 5 | 57 |
| 3,501 – 5,000 | 69 | 5 | 74 |
| 5,001 – 7,500 | 87 | 5 | 92 |
| 7,501 – 10,000 | 115 | 5 | 120 |

Defined once in `src/lib/fees.js` and mirrored in `public.mpesa_fee()` /
`public.send_fee()`. **Verify current Mpesa B2C rates before launch.**

---

## 🔁 Lifecycle

1. User builds a schedule and confirms → `create-schedule` inserts a PAUSED
   schedule + slots + a PENDING deposit and fires an **STK push** for the exact
   total.
2. User enters their Mpesa PIN → Safaricom calls **`stk-callback`** → deposit
   CONFIRMED → `activate_schedule()` flips the schedule to ACTIVE and
   **pre-generates every transaction** (one per slot per active day).
3. **`pg_cron`** runs `process_due_sends()` every minute, picks due PENDING rows
   (2-minute window guards against double-firing), and dispatches **`b2c-send`**.
4. **`b2c-result`** settles each send: SUCCESS deducts the locked balance;
   FAILED records a reason. **`b2c-timeout`** marks timeouts FAILED and SMS-alerts.
5. When all transactions are done, the schedule becomes **COMPLETED** and can be
   **recycled** into a new cycle.

**No free withdrawal.** Money only moves via scheduled sends. Cancellation is a
manual support review — the friction is the product.

---

## 🗺️ Out of scope (Phase 1)

Sends to other numbers, paybills/tills, free withdrawal, merchant escrow,
accountability partners, interest/yield, admin dashboard, and native apps. See
the build brief for the Phase 2 / Phase 3 roadmap.

---

_Pytif — MVP Build Brief v1.1 · Confidential · June 2026_
