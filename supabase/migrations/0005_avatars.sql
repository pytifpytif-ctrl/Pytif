-- Profile pictures: add avatar_url to the profile and a public storage bucket.

alter table public.users add column if not exists avatar_url text;

-- Public bucket for avatars (read by anyone, written by the owner).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Anyone can read avatars (they're public, used in <img>).
drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects
  for select using (bucket_id = 'avatars');

-- A user may write/replace only files under a folder named after their uid:
--   avatars/<auth.uid()>/avatar.png
drop policy if exists "avatars owner insert" on storage.objects;
create policy "avatars owner insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars owner update" on storage.objects;
create policy "avatars owner update" on storage.objects
  for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "avatars owner delete" on storage.objects;
create policy "avatars owner delete" on storage.objects
  for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
