-- Pytif — Mpesa number verification (OTP).
-- The Mpesa number is captured during profile setup (onboarding) and must be
-- confirmed via a one-time code before it is saved to the user's profile.

create table if not exists public.phone_verifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users(id) on delete cascade,
  mpesa_number text not null,
  code_hash    text not null,                  -- SHA-256 hex of the 6-digit code
  expires_at   timestamptz not null,
  attempts     integer not null default 0,
  consumed     boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_phone_verif_user on public.phone_verifications(user_id);

-- Service-role only: the send-otp / verify-otp edge functions are the sole
-- accessors. RLS on with no policies blocks all anon/authenticated access.
alter table public.phone_verifications enable row level security;

-- Allow the auth email fallback to be overwritten by a confirmed number even if
-- a stale row exists. (mpesa_number stays UNIQUE NOT NULL on public.users.)

-- Profiles now start UNVERIFIED — is_verified means "Mpesa number confirmed".
-- The number falls back to the auth email until onboarding confirms a real one.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, name, mpesa_number, is_verified)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Pytif user'),
    coalesce(new.raw_user_meta_data->>'mpesa_number', new.email),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
