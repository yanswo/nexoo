insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users can read profile avatars" on storage.objects;
drop policy if exists "users can upload their profile avatar" on storage.objects;
drop policy if exists "users can update their profile avatar" on storage.objects;

create policy "authenticated users can read profile avatars"
on storage.objects for select to authenticated
using (bucket_id = 'profile-avatars');

create policy "users can upload their profile avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users can update their profile avatar"
on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
