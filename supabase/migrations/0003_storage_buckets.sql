-- BAR8 storage buckets
--
-- All buckets are private (public = false); access is mediated entirely by
-- storage.objects RLS policies below, matched to the equivalent table
-- policies in 0002_rls_policies.sql. Signed/authenticated URLs are required
-- to read anything.
--
-- Path convention: object paths are namespaced by owner so ownership checks
-- can be done with a simple prefix match, e.g.
--   avatars/{profile_id}/...
--   cars/{profile_id}/{car_id}/...
-- Admin-managed buckets (events, stories) have no such requirement since only
-- admins may write to them.

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', false),
  ('cars', 'cars', false),
  ('events', 'events', false),
  ('stories', 'stories', false),
  ('applications', 'applications', false)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Read access: active members can read avatars, cars, events, stories.
-- ---------------------------------------------------------------------------

create policy "storage_members_read_avatars" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'avatars' and public.is_active_member());

create policy "storage_members_read_cars" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'cars' and public.is_active_member());

create policy "storage_members_read_events" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'events' and public.is_active_member());

create policy "storage_members_read_stories" on storage.objects
  for select
  to authenticated
  using (bucket_id = 'stories' and public.is_active_member());

-- ---------------------------------------------------------------------------
-- Owner write access: members can write to their own paths in
-- avatars/cars, identified by the first path segment being their own uid.
-- ---------------------------------------------------------------------------

create policy "storage_owner_write_avatars" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_update_avatars" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_delete_avatars" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_write_cars" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'cars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_update_cars" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'cars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "storage_owner_delete_cars" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'cars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- Admin write access: events, stories.
-- ---------------------------------------------------------------------------

create policy "storage_admin_write_events" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'events' and public.is_admin());

create policy "storage_admin_update_events" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'events' and public.is_admin())
  with check (bucket_id = 'events' and public.is_admin());

create policy "storage_admin_delete_events" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'events' and public.is_admin());

create policy "storage_admin_write_stories" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'stories' and public.is_admin());

create policy "storage_admin_update_stories" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'stories' and public.is_admin())
  with check (bucket_id = 'stories' and public.is_admin());

create policy "storage_admin_delete_stories" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'stories' and public.is_admin());

-- Admins also need read access to admin-managed buckets even before/without
-- being an active member technically covers it (is_admin implies typical
-- admin accounts are active members too, but this keeps admin access
-- unconditional and independent of membership status).
create policy "storage_admin_read_all" on storage.objects
  for select
  to authenticated
  using (
    bucket_id in ('avatars', 'cars', 'events', 'stories', 'applications')
    and public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- applications bucket: anon can upload the optional car photo from the
-- public membership form. No read policy is defined for anon/authenticated
-- non-admins — matches membership_applications having no public SELECT.
-- ---------------------------------------------------------------------------

create policy "storage_anon_write_applications" on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'applications');
