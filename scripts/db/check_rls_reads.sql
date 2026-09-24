-- Asserts the phase 1 read policies DECIDE correctly, not merely that they exist.
--
-- `check_household_link_writes.sql` inspects the catalog: RLS on, no browser
-- write grants, a policy whose text mentions auth.uid(). All of that can be
-- true of a policy that admits everybody -- reading the top-level `role` claim
-- instead of `app_metadata.role` is exactly such a policy, and no catalog
-- check can tell the two apart. So this one impersonates callers and counts
-- rows.
--
-- It runs in one transaction and rolls back, leaving no fixtures behind.

begin;

-- Supabase grants anon/authenticated their table privileges through
-- pg_default_acl. CI's bootstrap has no such defaults, so without these grants
-- every impersonated read below fails with "permission denied" before a policy
-- is ever consulted -- the check would pass for the wrong reason. Granting here
-- reproduces the deployed shape for the life of this transaction.
grant select on households, children, user_households to authenticated;
grant select on branding_settings to authenticated, anon;
-- anon is granted these in the deployed database too -- the policies, not the
-- absence of a grant, are what return a signed-out visitor no rows. Without
-- this the anon assertions below would fail on permissions and never reach a
-- policy, which is passing for the wrong reason.
grant select on households, children to anon;
-- The app's leader lookup runs as the caller and reads all three of these.
grant select on ministry_accounts, ministry_groups, ministry_group_members to authenticated;

-- Fixtures, written as the table owner, which RLS does not apply to.
insert into households (household_id, name) values
	('rls-hh-a', 'Household A'),
	('rls-hh-b', 'Household B'),
	('rls-hh-led', 'Household in a led ministry');

insert into user_households (auth_user_id, household_id) values
	('00000000-0000-0000-0000-00000000000a', 'rls-hh-a'),
	('00000000-0000-0000-0000-00000000000b', 'rls-hh-b');

insert into children (child_id, household_id) values
	('rls-ch-a', 'rls-hh-a'),
	('rls-ch-b', 'rls-hh-b'),
	('rls-ch-led', 'rls-hh-led');

insert into ministries (ministry_id) values ('rls-min');
insert into ministry_enrollments (enrollment_id, child_id, ministry_id) values
	('rls-en', 'rls-ch-led', 'rls-min');
insert into leader_assignments (assignment_id, leader_id, ministry_id, is_active) values
	('rls-la', '00000000-0000-0000-0000-00000000000c', 'rls-min', true),
	-- A leader who has been stood down. The row stays; the scope must not.
	('rls-la-off', '00000000-0000-0000-0000-00000000000e', 'rls-min', false);

insert into branding_settings (org_id) values ('rls-org');

-- The way the app actually grants leadership: a ministry's shared address.
-- `auth-context.tsx` resolves ministries from the sign-in email through
-- `fn_ministry_ids_email_can_access`; `leader_assignments` above is the
-- secondary path. Phase 1 modelled only the secondary one, and this check
-- faithfully tested it while every email-identified leader was locked out.
insert into ministries (ministry_id) values ('rls-min-email');
insert into ministry_accounts (ministry_id, email, is_active) values
	('rls-min-email', 'rls-ministry@example.test', true);
insert into households (household_id, name) values ('rls-hh-email', 'Household in an email-led ministry');
insert into children (child_id, household_id) values ('rls-ch-email', 'rls-hh-email');
insert into ministry_enrollments (enrollment_id, child_id, ministry_id) values
	('rls-en-email', 'rls-ch-email', 'rls-min-email');

insert into registration_cycles (cycle_id, name, start_date, end_date) values
	('rls-cycle', 'RLS check cycle', now(), now() + interval '1 day');

create temp table rls_probe (what text, got bigint, want bigint);
grant insert on rls_probe to authenticated, anon;

-- A signed-out visitor.
set local role anon;
insert into rls_probe select 'anon: households', count(*), 0 from households where household_id like 'rls-hh-%';
insert into rls_probe select 'anon: branding_settings (logo on /login)', count(*), 1 from branding_settings where org_id = 'rls-org';
insert into rls_probe select 'anon: registration_cycles (cycle on the home page)', count(*), 1 from registration_cycles where cycle_id = 'rls-cycle';
reset role;

-- Signed in, but carrying no app role: the GUEST default, not a free pass.
set local role authenticated;
set local request.jwt.claims = '';
insert into rls_probe select 'guest: households', count(*), 0 from households where household_id like 'rls-hh-%';
insert into rls_probe select 'guest: children', count(*), 0 from children where child_id like 'rls-ch-%';
reset role;

-- Guardian A. Note the token says role=authenticated at the top level and
-- GUARDIAN under app_metadata, which is the shape Supabase actually issues.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}';
insert into rls_probe select 'guardian A: own household', count(*), 1 from households where household_id = 'rls-hh-a';
insert into rls_probe select 'guardian A: every other household', count(*), 0 from households where household_id in ('rls-hh-b', 'rls-hh-led');
insert into rls_probe select 'guardian A: own children', count(*), 1 from children where child_id = 'rls-ch-a';
insert into rls_probe select 'guardian A: other households'' children', count(*), 0 from children where child_id in ('rls-ch-b', 'rls-ch-led');
insert into rls_probe select 'guardian A: own household link', count(*), 1 from user_households where auth_user_id = '00000000-0000-0000-0000-00000000000a';
insert into rls_probe select 'guardian A: other household links', count(*), 0 from user_households where auth_user_id = '00000000-0000-0000-0000-00000000000b';
reset role;

-- Guardian B, to prove the predicate follows the caller rather than admitting
-- whoever happens to be first.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}';
insert into rls_probe select 'guardian B: own household', count(*), 1 from households where household_id = 'rls-hh-b';
insert into rls_probe select 'guardian B: guardian A''s household', count(*), 0 from households where household_id = 'rls-hh-a';
reset role;

-- A ministry leader reaches households through enrollment in a ministry they
-- lead, and no further.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated","app_metadata":{"role":"MINISTRY_LEADER"}}';
insert into rls_probe select 'leader: household in a led ministry', count(*), 1 from households where household_id = 'rls-hh-led';
insert into rls_probe select 'leader: unrelated households', count(*), 0 from households where household_id in ('rls-hh-a', 'rls-hh-b');
insert into rls_probe select 'leader: child in a led ministry', count(*), 1 from children where child_id = 'rls-ch-led';
reset role;

-- A leader identified by email alone: no app role in the token, no
-- leader_assignments row. This is what a real ministry sign-in looks like.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f1","email":"rls-ministry@example.test","role":"authenticated","app_metadata":{}}';
-- The app calls this RPC from the browser, as the caller, to decide the user
-- is a leader at all. Zero here means the role never leaves GUEST.
insert into rls_probe select 'email leader: app''s ministry lookup, as caller', count(*), 1 from fn_ministry_ids_email_can_access('rls-ministry@example.test');
insert into rls_probe select 'email leader: household in their ministry', count(*), 1 from households where household_id = 'rls-hh-email';
insert into rls_probe select 'email leader: child in their ministry', count(*), 1 from children where child_id = 'rls-ch-email';
insert into rls_probe select 'email leader: unrelated households', count(*), 0 from households where household_id in ('rls-hh-a', 'rls-hh-b', 'rls-hh-led');
reset role;

-- Signed in with an address that leads nothing. Proves the email branch
-- filters on the caller's address rather than admitting anyone with one.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000f2","email":"nobody@example.test","role":"authenticated","app_metadata":{}}';
insert into rls_probe select 'signed-in stranger: households', count(*), 0 from households where household_id like 'rls-hh-%';
insert into rls_probe select 'signed-in stranger: children', count(*), 0 from children where child_id like 'rls-ch-%';
reset role;

-- The same ministry, the same child, one flag apart.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000e","role":"authenticated","app_metadata":{"role":"MINISTRY_LEADER"}}';
insert into rls_probe select 'stood-down leader: households', count(*), 0 from households where household_id like 'rls-hh-%';
insert into rls_probe select 'stood-down leader: children', count(*), 0 from children where child_id like 'rls-ch-%';
reset role;

-- An admin reads everything. This assertion is what gives the guardian ones
-- their force: without it, a helper that resolved every caller to a non-admin
-- would also pass, and so would one that read the wrong claim -- the top-level
-- `role` is `authenticated` in the very same token.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","role":"authenticated","app_metadata":{"role":"ADMIN"}}';
insert into rls_probe select 'admin: every household', count(*), 4 from households where household_id like 'rls-hh-%';
insert into rls_probe select 'admin: every child', count(*), 4 from children where child_id like 'rls-ch-%';
reset role;

-- Structural: a table added later must not arrive unprotected. `keepalive` is
-- write-only by design and predates this work; the two orphan tables are
-- deliberately unreadable rather than policied.
insert into rls_probe
select 'public tables without RLS', count(*), 0
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

insert into rls_probe
select 'RLS tables with no SELECT policy', count(*), 0
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
   and c.relname not in ('keepalive', 'ministry_leaders', 'timeslots')
   and not exists (
     select 1 from pg_policies p
      where p.schemaname = 'public' and p.tablename = c.relname
        and p.cmd in ('SELECT', 'ALL'));

do $$
declare
	failures text;
	total bigint;
begin
	select count(*) into total from rls_probe;
	select string_agg(format('  %s: got %s, want %s', what, got, want), E'\n' order by what)
	  into failures from rls_probe where got <> want;
	if failures is not null then
		raise exception E'RLS read policy checks FAILED:\n%', failures;
	end if;
	raise notice 'RLS read policy checks passed (% assertions)', total;
end $$;

rollback;
