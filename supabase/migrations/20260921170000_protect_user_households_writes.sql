-- Make the household link non-client-writable.
--
-- `user_households` maps an auth user to the household whose data they may see.
-- It carried no RLS and granted INSERT/UPDATE/DELETE to `anon` and
-- `authenticated`, so a signed-in guardian could repoint their own row at any
-- household and every server check that trusts the mapping would then serve
-- that household's data. Verified against local seed data before this
-- migration: repointing the link made `GET /api/household/attendance` return
-- another family's rows.
--
-- Reads stay available to the client, because `getHouseholdForUser` runs in the
-- browser on every guardian page load, but they are narrowed to the caller's
-- own row — the whole auth-user-to-household mapping was previously readable.
-- Writes move to the service role, which bypasses RLS and keeps its grants.

alter table user_households enable row level security;

-- `auth_user_id` is text while `auth.uid()` is uuid.
drop policy if exists "users_can_read_own_household_link" on user_households;
create policy "users_can_read_own_household_link"
on user_households
for select
to authenticated
using (auth_user_id = auth.uid()::text);

-- No insert/update/delete policy is defined on purpose: with RLS enabled and no
-- permissive policy, those commands are denied for every non-bypassing role.
-- The grants go too, so the denial does not depend on RLS alone.
revoke insert, update, delete, truncate on user_households from anon;
revoke insert, update, delete, truncate on user_households from authenticated;

-- `anon` has no legitimate read either: the link is only meaningful to a
-- signed-in user asking about themselves.
revoke select on user_households from anon;
