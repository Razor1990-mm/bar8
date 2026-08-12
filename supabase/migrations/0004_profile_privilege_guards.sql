-- Close two holes left open by the owner-writable policies in 0002.
--
-- 1. PRIVILEGE ESCALATION. `profiles_update_own` lets a member update their
--    own row, and RLS is row-level, not column-level — so nothing stopped a
--    member from setting `is_admin = true` on themselves and acquiring full
--    read/write over every table, including membership_applications.
--
-- 2. SELF-APPROVAL. `profiles_insert_own` let a freshly signed-up user insert
--    their own profile with status = 'active'. Manual admin approval is a core
--    product requirement, not a formality; the database must enforce it.
--
-- Fix: a BEFORE INSERT/UPDATE trigger that pins the three privileged columns
-- to safe values unless the caller is already an admin. Trigger runs after RLS
-- has admitted the row, so it constrains exactly the owner-write path.

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins (and server-side code using the service role, which bypasses RLS
  -- and triggers with SECURITY DEFINER context) may set anything.
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Self-service signup always lands as a pending, non-admin member.
    new.is_admin := false;
    new.status := 'pending';
    new.member_since := null;
  else
    -- Members may edit their bio, city, links and avatar; never their standing.
    new.is_admin := old.is_admin;
    new.status := old.status;
    new.member_since := old.member_since;
  end if;

  return new;
end;
$$;

create trigger guard_profile_privileges
  before insert or update on public.profiles
  for each row
  execute function public.guard_profile_privileges();

-- A pending applicant must be able to read their own row to be told they are
-- pending. `profiles_select_members` requires status = 'active', which locks a
-- pending user out of their own record and leaves the app unable to render
-- their state.
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (id = auth.uid());
