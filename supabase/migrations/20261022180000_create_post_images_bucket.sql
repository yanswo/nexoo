insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-posts', 'school-posts', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "authenticated users can read post images" on storage.objects;
drop policy if exists "authenticated users can upload post images" on storage.objects;
drop policy if exists "users can delete their post images" on storage.objects;

create policy "authenticated users can read post images"
on storage.objects for select to authenticated
using (bucket_id = 'school-posts');

create policy "authenticated users can upload post images"
on storage.objects for insert to authenticated
with check (bucket_id = 'school-posts' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "users can delete their post images"
on storage.objects for delete to authenticated
using (bucket_id = 'school-posts' and (storage.foldername(name))[1] = (select auth.uid())::text);
