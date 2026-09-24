-- Leader read scope follows the app's own rule: leaders are identified by email.
--
-- Phase 1 (20260923120000) scoped a leader's reads through
-- `leader_assignments.leader_id = auth.uid()`. That is not how the app decides
-- who leads what. `auth-context.tsx` resolves a leader's ministries from their
-- sign-in email through `fn_ministry_ids_email_can_access`, which matches
-- `ministry_accounts.email` (one shared address per ministry) and
-- `ministry_groups.email`. Measured against the local database, the phase 1
-- predicate gave the Sunday School account 0 ministries and 0 children where the
-- app's rule gives 1 and 117, and no `leader_assignments.leader_id` corresponded
-- to an auth user at all.
--
-- It failed twice over. The email lookup runs as the caller and reads
-- `ministry_accounts`, which phase 1 made admin-only, so the app could not even
-- tell the user was a leader: the role never left GUEST.

-- 1. The caller's ministries, by the app's rule, plus any direct assignment.
--    Takes no argument on purpose: it answers for the signed-in caller only,
--    so it cannot be used to ask what some other address may reach.
--    Security definer so it can read `ministry_accounts` and `auth.users`
--    whatever their own policies say; the invoker function it calls runs with
--    these privileges.
--
--    The address comes from `auth.users`, not the token, and only once it is
--    confirmed. The token's `email` claim is whatever the account held when the
--    token was minted; `auth.users` is the server's current record, and
--    `email_confirmed_at` is the only verification signal Supabase keeps. What
--    this does NOT cover: with the project's "Confirm email" setting off,
--    Supabase stamps `email_confirmed_at` at sign-up, so the column cannot tell
--    a proven address from a typed one. That setting is the control; this is
--    the check that holds when it is on.
create or replace function app_leader_ministry_ids()
returns table (ministry_id text)
language sql
stable
security definer
set search_path = public
as $$
	select f.ministry_id
	  from auth.users u
	 cross join lateral fn_ministry_ids_email_can_access(u.email) f
	 where u.id = auth.uid()
	   and u.email_confirmed_at is not null
	   and coalesce(u.email, '') <> ''
	union
	select la.ministry_id
	  from leader_assignments la
	 where la.leader_id = auth.uid()::text
	   and coalesce(la.is_active, true);
$$;

revoke all on function app_leader_ministry_ids() from public;
grant execute on function app_leader_ministry_ids() to authenticated;

-- 2. Household scope: the leader branch now goes through the helper above.
--    The admin and household-member branches are unchanged.
create or replace function app_household_ids()
returns table (household_id text)
language sql
stable
security definer
set search_path = public
as $$
	select h.household_id from households h where app_is_admin()
	union
	select uh.household_id from user_households uh
	 where uh.auth_user_id = auth.uid()::text
	union
	select c.household_id
	  from children c
	  join ministry_enrollments me on me.child_id = c.child_id
	 where me.ministry_id in (select ministry_id from app_leader_ministry_ids())
	   and c.household_id is not null;
$$;

-- 3. `ministry_accounts` back to readable by any signed-in user, as it was
--    before phase 1. It holds a ministry's shared contact address and display
--    name -- no personal data -- and two things depend on reading it as the
--    caller: the leader lookup above when the browser calls it directly, and
--    `listMinistries`, which shows each ministry's contact email and quietly
--    dropped it for every non-admin.
drop policy if exists ministry_accounts_select on ministry_accounts;
create policy ministry_accounts_select on ministry_accounts
	for select to authenticated using (true);

-- 4. `registration_cycles` readable signed-out. The public home page renders
--    the active cycle's name server-side with the anon key and, by design,
--    falls back to cycle-free copy when the read fails -- so phase 1 removed
--    the label without an error anywhere. Cycle names and dates are not
--    personal data, and signed-out visitors could read them before phase 1.
grant select on registration_cycles to anon;
drop policy if exists registration_cycles_select_anon on registration_cycles;
create policy registration_cycles_select_anon on registration_cycles
	for select to anon using (true);
