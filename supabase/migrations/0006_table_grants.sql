-- The initial migrations never granted table privileges — Supabase's default
-- grants apply only to objects created through its dashboard/defaults, and
-- these tables were created by CLI migrations without an explicit GRANT, so
-- anon/authenticated/service_role held no DML rights at all (every query
-- failed with "permission denied" before RLS was even consulted).
--
-- Grants are the coarse gate; RLS policies (0002/0004/0005) remain the
-- fine-grained security layer. service_role additionally bypasses RLS by
-- design — that is what makes it the admin/system credential.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;

grant usage, select on all sequences in schema public
  to anon, authenticated, service_role;

grant execute on all functions in schema public
  to anon, authenticated, service_role;

-- Future tables created by later migrations get the same treatment.
alter default privileges in schema public
  grant select, insert, update, delete on tables
  to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage, select on sequences to anon, authenticated, service_role;

alter default privileges in schema public
  grant execute on functions to anon, authenticated, service_role;
