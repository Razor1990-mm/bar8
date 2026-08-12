-- BAR8 row level security policies

alter table public.profiles enable row level security;
alter table public.cars enable row level security;
alter table public.car_photos enable row level security;
alter table public.events enable row level security;
alter table public.event_schedule_items enable row level security;
alter table public.event_attendance enable row level security;
alter table public.stories enable row level security;
alter table public.story_photos enable row level security;
alter table public.membership_applications enable row level security;

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create policy "events_select_published" on public.events
  for select
  to anon, authenticated
  using (status = 'published');

create policy "events_admin_all" on public.events
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------

create policy "stories_select_published" on public.stories
  for select
  to anon, authenticated
  using (status = 'published');

create policy "stories_admin_all" on public.stories
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- story_photos (visibility follows the parent story)
-- ---------------------------------------------------------------------------

create policy "story_photos_select_published" on public.story_photos
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.stories s
      where s.id = story_photos.story_id
        and s.status = 'published'
    )
  );

create policy "story_photos_admin_all" on public.story_photos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles_select_members" on public.profiles
  for select
  to authenticated
  using (public.is_active_member());

create policy "profiles_insert_own" on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "profiles_delete_own" on public.profiles
  for delete
  to authenticated
  using (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------

create policy "cars_select_members" on public.cars
  for select
  to authenticated
  using (public.is_active_member());

create policy "cars_insert_own" on public.cars
  for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "cars_update_own" on public.cars
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "cars_delete_own" on public.cars
  for delete
  to authenticated
  using (profile_id = auth.uid());

create policy "cars_admin_all" on public.cars
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- car_photos (ownership follows the parent car's profile_id)
-- ---------------------------------------------------------------------------

create policy "car_photos_select_members" on public.car_photos
  for select
  to authenticated
  using (public.is_active_member());

create policy "car_photos_insert_own" on public.car_photos
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.cars c
      where c.id = car_photos.car_id
        and c.profile_id = auth.uid()
    )
  );

create policy "car_photos_update_own" on public.car_photos
  for update
  to authenticated
  using (
    exists (
      select 1 from public.cars c
      where c.id = car_photos.car_id
        and c.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.cars c
      where c.id = car_photos.car_id
        and c.profile_id = auth.uid()
    )
  );

create policy "car_photos_delete_own" on public.car_photos
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.cars c
      where c.id = car_photos.car_id
        and c.profile_id = auth.uid()
    )
  );

create policy "car_photos_admin_all" on public.car_photos
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- event_schedule_items
-- ---------------------------------------------------------------------------

create policy "event_schedule_items_select_members" on public.event_schedule_items
  for select
  to authenticated
  using (public.is_active_member());

create policy "event_schedule_items_admin_all" on public.event_schedule_items
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- event_attendance
-- ---------------------------------------------------------------------------

create policy "event_attendance_select_members" on public.event_attendance
  for select
  to authenticated
  using (public.is_active_member());

create policy "event_attendance_insert_own" on public.event_attendance
  for insert
  to authenticated
  with check (profile_id = auth.uid());

create policy "event_attendance_update_own" on public.event_attendance
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "event_attendance_delete_own" on public.event_attendance
  for delete
  to authenticated
  using (profile_id = auth.uid());

create policy "event_attendance_admin_all" on public.event_attendance
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- membership_applications
--
-- Holds emails and phone numbers: intentionally no public/member SELECT
-- policy of any kind. Only admins may read or update; anon may submit.
-- ---------------------------------------------------------------------------

create policy "membership_applications_insert_public" on public.membership_applications
  for insert
  to anon, authenticated
  with check (true);

create policy "membership_applications_select_admin" on public.membership_applications
  for select
  to authenticated
  using (public.is_admin());

create policy "membership_applications_update_admin" on public.membership_applications
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "membership_applications_delete_admin" on public.membership_applications
  for delete
  to authenticated
  using (public.is_admin());
