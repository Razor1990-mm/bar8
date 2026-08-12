-- BAR8 initial schema
-- No Audi/R8-specific columns, enums, or defaults anywhere: make/model are free text
-- everywhere a vehicle is described, per docs/BRIEF.md.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type profile_status as enum ('pending', 'active', 'inactive');
create type car_ownership as enum ('current', 'former');
create type event_category as enum ('drive', 'track', 'social', 'dinner', 'trip', 'access');
create type event_attendance_source as enum ('luma', 'native');
create type event_status as enum ('draft', 'published');
create type attendance_status as enum ('going', 'waitlist', 'declined');
create type attendance_rsvp_source as enum ('luma', 'native', 'admin');
create type story_status as enum ('draft', 'published');
create type application_status as enum ('new', 'reviewing', 'approved', 'declined');

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  slug text not null unique,
  city text,
  region text,
  role_title text,
  bio text,
  avatar_path text,
  instagram text,
  linkedin text,
  status profile_status not null default 'pending',
  is_admin boolean not null default false,
  member_since date,
  created_at timestamptz not null default now()
);

create index profiles_slug_idx on public.profiles (slug);
create index profiles_status_idx on public.profiles (status);

-- ---------------------------------------------------------------------------
-- cars
-- ---------------------------------------------------------------------------

create table public.cars (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  year int,
  make text not null,
  model text not null,
  trim text,
  exterior_color text,
  interior_color text,
  modifications text,
  story text,
  is_primary boolean not null default false,
  ownership car_ownership not null default 'current',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index cars_profile_id_idx on public.cars (profile_id);

-- ---------------------------------------------------------------------------
-- car_photos
-- ---------------------------------------------------------------------------

create table public.car_photos (
  id uuid primary key default gen_random_uuid(),
  car_id uuid not null references public.cars (id) on delete cascade,
  storage_path text not null,
  is_hero boolean not null default false,
  sort_order int not null default 0,
  credit text
);

create index car_photos_car_id_idx on public.car_photos (car_id);

-- ---------------------------------------------------------------------------
-- events
-- ---------------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  category event_category not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/Los_Angeles',
  meet_time text,
  depart_time text,
  start_location_label text,
  start_lat numeric,
  start_lng numeric,
  route_summary text,
  distance_miles numeric,
  est_drive_minutes int,
  capacity int,
  hero_photo_path text,
  description text,
  luma_event_url text,
  luma_event_id text,
  attendance_source event_attendance_source not null default 'luma',
  attendee_count_override int,
  whatsapp_chat_url text,
  status event_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index events_slug_idx on public.events (slug);
create index events_status_idx on public.events (status);
create index events_starts_at_idx on public.events (starts_at);
create index events_category_idx on public.events (category);

-- ---------------------------------------------------------------------------
-- event_schedule_items
-- ---------------------------------------------------------------------------

create table public.event_schedule_items (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  time_label text not null,
  label text not null,
  sort_order int not null default 0
);

create index event_schedule_items_event_id_idx on public.event_schedule_items (event_id);

-- ---------------------------------------------------------------------------
-- event_attendance
-- ---------------------------------------------------------------------------

create table public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  car_id uuid references public.cars (id) on delete set null,
  status attendance_status not null default 'going',
  source attendance_rsvp_source not null default 'luma',
  created_at timestamptz not null default now(),
  unique (event_id, profile_id)
);

create index event_attendance_event_id_idx on public.event_attendance (event_id);
create index event_attendance_profile_id_idx on public.event_attendance (profile_id);
create index event_attendance_car_id_idx on public.event_attendance (car_id);

-- ---------------------------------------------------------------------------
-- stories
-- ---------------------------------------------------------------------------

create table public.stories (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events (id) on delete set null,
  slug text not null unique,
  title text not null,
  dek text,
  body text,
  hero_photo_path text,
  status story_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index stories_slug_idx on public.stories (slug);
create index stories_status_idx on public.stories (status);
create index stories_event_id_idx on public.stories (event_id);

-- ---------------------------------------------------------------------------
-- story_photos
-- ---------------------------------------------------------------------------

create table public.story_photos (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories (id) on delete cascade,
  storage_path text not null,
  caption text,
  aspect text,
  sort_order int not null default 0
);

create index story_photos_story_id_idx on public.story_photos (story_id);

-- ---------------------------------------------------------------------------
-- membership_applications
-- ---------------------------------------------------------------------------

create table public.membership_applications (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text,
  city text,
  primary_car text,
  other_cars text,
  instagram text,
  linkedin text,
  referred_by text,
  about text,
  car_photo_path text,
  status application_status not null default 'new',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index membership_applications_status_idx on public.membership_applications (status);
create index membership_applications_email_idx on public.membership_applications (email);
create index membership_applications_reviewed_by_idx on public.membership_applications (reviewed_by);

-- ---------------------------------------------------------------------------
-- Helper functions used by RLS policies (0002).
--
-- Both are SECURITY DEFINER with a pinned search_path so they can read
-- public.profiles regardless of the calling role's RLS visibility, which
-- avoids recursive RLS evaluation on the profiles table itself (a policy on
-- profiles that queries profiles would otherwise recurse into itself).
-- ---------------------------------------------------------------------------

create or replace function public.is_active_member()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;
