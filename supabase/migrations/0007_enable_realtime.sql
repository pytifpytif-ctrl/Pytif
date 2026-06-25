-- Enable Supabase Realtime for live PWA updates (schedules, transactions, deposits, profile).

do $$
begin
  alter publication supabase_realtime add table public.schedules;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.transactions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.deposits;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.users;
exception when duplicate_object then null;
end $$;
