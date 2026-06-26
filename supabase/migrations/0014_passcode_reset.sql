-- Email-based app passcode reset tokens (passcode itself stays on device).

create table if not exists public.passcode_reset_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  token_hash   text not null,
  expires_at   timestamptz not null,
  consumed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists idx_passcode_reset_user on public.passcode_reset_tokens(user_id, created_at desc);
create index if not exists idx_passcode_reset_hash on public.passcode_reset_tokens(token_hash);

alter table public.passcode_reset_tokens enable row level security;
