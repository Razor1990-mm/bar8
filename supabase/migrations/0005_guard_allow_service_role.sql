-- 0004's guard pinned privileged profile columns for every writer whose
-- is_admin() is false — but auth.uid() is NULL for the service role and for
-- direct SQL (seeds, migrations), so system paths ALSO got pinned: a seed
-- could never create an active member and an admin server route using the
-- service-role client could never approve one.
--
-- Triggers fire regardless of RLS bypass; the guard must distinguish
-- "unprivileged member" (auth.uid() present, not admin) from "system writer"
-- (no auth.uid() at all).

create or replace function public.guard_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- System writers (service role, seeds, migrations) have no auth.uid();
  -- admins are checked explicitly. Both may set anything.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.is_admin := false;
    new.status := 'pending';
    new.member_since := null;
  else
    new.is_admin := old.is_admin;
    new.status := old.status;
    new.member_since := old.member_since;
  end if;

  return new;
end;
$$;
