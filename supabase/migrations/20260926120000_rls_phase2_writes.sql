-- Phase 2 of #495 / #527: the database decides who may WRITE, not only who may read.
--
-- Phase 1 scoped reads and left every table with permissive insert/update/
-- delete placeholders (`*_todo_496`). With those in place the read policy was
-- the only thing narrowing anything, so read scope was write scope: a ministry
-- leader could rename any household in their ministries and delete its
-- guardians.
--
-- The rule, decided on #527: match what the app already allows.
--
--   Family records (households, guardians, emergency contacts, children,
--   registrations, yearly profiles, ministry enrollments): the family and
--   admins. Leaders read them and never write them -- `canEditHousehold`
--   shows the edit controls to admins and the household's own guardian only.
--
--   Attendance and incidents: leaders, for children in their ministries, and
--   admins. Only admins acknowledge or remove an incident.
--
--   Bible Bee: admins and leaders of the Bible Bee ministry. A family may mark
--   their own child's scriptures complete and essays submitted -- the one thing
--   the family's Bible Bee page does -- and nothing else (enforced by column
--   guards below, since a policy cannot restrict columns).
--
--   Everything else (reference data, staff records): admins, except that a
--   leader may edit the contact fields of their own leader profile, which the
--   settings screen does.
--
-- "Family" is household MEMBERSHIP (`user_households`), deliberately not the
-- read helper `app_household_ids()`, which also admits leader scope.
--
-- Prerequisite: 20260925120000_bible_bee_assignments_server_side, which moved
-- the two family paths that inserted Bible Bee rows to the server.

-- ---------------------------------------------------------------------------
-- Who is writing
-- ---------------------------------------------------------------------------

-- Households the caller belongs to. Membership only; no leader scope.
create or replace function app_member_household_ids()
returns table (household_id text)
language sql
stable
security definer
set search_path = public
as $$
	select uh.household_id
	  from user_households uh
	 where uh.auth_user_id = auth.uid()::text;
$$;

-- Children in households the caller belongs to.
create or replace function app_member_child_ids()
returns table (child_id text)
language sql
stable
security definer
set search_path = public
as $$
	select c.child_id
	  from children c
	 where c.household_id in (select household_id from app_member_household_ids());
$$;

-- Children enrolled in a ministry the caller leads, by the app's own rule
-- (`app_leader_ministry_ids`: confirmed ministry address, or an active
-- assignment).
create or replace function app_leader_child_ids()
returns table (child_id text)
language sql
stable
security definer
set search_path = public
as $$
	select distinct me.child_id
	  from ministry_enrollments me
	 where me.ministry_id in (select ministry_id from app_leader_ministry_ids())
	   and me.child_id is not null;
$$;

-- Supabase grants execute on new functions to `anon` through its default
-- privileges, which revoking from `public` does not touch.
revoke all on function app_member_household_ids() from public, anon;
revoke all on function app_member_child_ids() from public, anon;
revoke all on function app_leader_child_ids() from public, anon;
grant execute on function app_member_household_ids() to authenticated;
grant execute on function app_member_child_ids() to authenticated;
grant execute on function app_leader_child_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Write policies
-- ---------------------------------------------------------------------------
-- One row per table: who may insert, update and delete. An update policy uses
-- the same expression for USING and WITH CHECK, so a row can neither be
-- reached nor moved outside the caller's scope (a guardian cannot re-parent a
-- child into another household).

do $$
declare
	admin_only   constant text := 'app_is_admin()';
	bible_bee    constant text := 'app_is_admin() or app_is_bible_bee_leader()';
	own_house    constant text := 'app_is_admin() or household_id in (select household_id from app_member_household_ids())';
	own_child    constant text := 'app_is_admin() or child_id in (select child_id from app_member_child_ids())';
	led_child    constant text := 'app_is_admin() or child_id in (select child_id from app_leader_child_ids())';
	r record;
begin
	for r in
		select * from (values
			-- Family records. A household row is only ever created by the
			-- server (`POST /api/household`), linked in the same step.
			('households',             admin_only, own_house,  admin_only),
			('guardians',              own_house,  own_house,  own_house),
			('emergency_contacts',     own_house,  own_house,  own_house),
			('children',               own_house,  own_house,  own_house),
			('registrations',          own_child,  own_child,  own_child),
			('child_year_profiles',    own_child,  own_child,  own_child),
			('ministry_enrollments',   own_child,  own_child,  own_child),

			-- The door.
			('attendance',             led_child,  led_child,  admin_only),
			-- A leader logs an incident under their own name, about a child
			-- they serve. Acknowledging and removing are admin actions.
			('incidents',
				'app_is_admin() or (leader_id = auth.uid()::text and child_id in (select child_id from app_leader_child_ids()))',
				admin_only, admin_only),

			-- Bible Bee. The family's completion and submission updates are
			-- admitted here and narrowed to those columns by the guards below.
			('bible_bee_enrollments',  bible_bee,  bible_bee,  bible_bee),
			('enrollment_overrides',   bible_bee,  bible_bee,  bible_bee),
			('student_scriptures',     bible_bee,
				'app_is_admin() or app_is_bible_bee_leader() or child_id in (select child_id from app_member_child_ids())',
				bible_bee),
			('student_essays',         bible_bee,
				'app_is_admin() or app_is_bible_bee_leader() or child_id in (select child_id from app_member_child_ids())',
				bible_bee),
			('bible_bee_cycles',       bible_bee,  bible_bee,  bible_bee),
			('competition_years',      bible_bee,  bible_bee,  bible_bee),
			('divisions',              bible_bee,  bible_bee,  bible_bee),
			('scriptures',             bible_bee,  bible_bee,  bible_bee),
			('essay_prompts',          bible_bee,  bible_bee,  bible_bee),

			-- Reference data.
			('branding_settings',      admin_only, admin_only, admin_only),
			('events',                 admin_only, admin_only, admin_only),
			('grade_rules',            admin_only, admin_only, admin_only),
			('ministries',             admin_only, admin_only, admin_only),
			('ministry_groups',        admin_only, admin_only, admin_only),
			('ministry_group_members', admin_only, admin_only, admin_only),
			('registration_cycles',    admin_only, admin_only, admin_only),

			-- Staff records. `leader_assignments` and `ministry_accounts` decide
			-- a leader's scope, so a leader writing them would grant themselves
			-- access.
			('users',                  admin_only, admin_only, admin_only),
			('leader_assignments',     admin_only, admin_only, admin_only),
			('ministry_accounts',      admin_only, admin_only, admin_only),
			('daily_digest_checkpoints', admin_only, admin_only, admin_only),
			-- Own profile's contact fields only; see the guard below.
			('leader_profiles',        admin_only, 'app_is_admin() or leader_id = auth.uid()', admin_only)
		) as v(t, ins, upd, del)
	loop
		execute format('drop policy if exists %I on %I', r.t || '_insert_todo_496', r.t);
		execute format('drop policy if exists %I on %I', r.t || '_update_todo_496', r.t);
		execute format('drop policy if exists %I on %I', r.t || '_delete_todo_496', r.t);

		execute format('drop policy if exists %I on %I', r.t || '_insert', r.t);
		execute format('create policy %I on %I for insert to authenticated with check (%s)',
			r.t || '_insert', r.t, r.ins);
		execute format('drop policy if exists %I on %I', r.t || '_update', r.t);
		execute format('create policy %I on %I for update to authenticated using (%s) with check (%s)',
			r.t || '_update', r.t, r.upd, r.upd);
		execute format('drop policy if exists %I on %I', r.t || '_delete', r.t);
		execute format('create policy %I on %I for delete to authenticated using (%s)',
			r.t || '_delete', r.t, r.del);
	end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Column guards
-- ---------------------------------------------------------------------------
-- A policy decides which rows; these decide which columns, for the callers
-- the policies admit only to change a few. They run as the caller, and step
-- aside for anyone who is not a browser session (the server, migrations) and
-- for admins and Bible Bee leaders, who may change the whole row.

create or replace function guard_family_student_scripture_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	allowed constant text[] := array['is_completed', 'completed_at', 'updated_at'];
begin
	if current_user <> 'authenticated' or app_is_admin() or app_is_bible_bee_leader() then
		return new;
	end if;
	if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
		raise exception 'a family may only mark a scripture complete or not complete'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

create or replace function guard_family_student_essay_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	allowed constant text[] := array['status', 'submitted_at', 'updated_at'];
begin
	if current_user <> 'authenticated' or app_is_admin() or app_is_bible_bee_leader() then
		return new;
	end if;
	if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed)
	   or (new.status is distinct from old.status and new.status <> 'submitted') then
		raise exception 'a family may only submit an essay' using errcode = '42501';
	end if;
	return new;
end;
$$;

-- `is_active` is how an admin stands a leader down, so a leader editing their
-- own profile must not be able to reach it -- or anything but contact fields.
create or replace function guard_own_leader_profile_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
	allowed constant text[] := array['email', 'phone', 'photo_url', 'avatar_path', 'updated_at'];
begin
	if current_user <> 'authenticated' or app_is_admin() then
		return new;
	end if;
	if (to_jsonb(new) - allowed) is distinct from (to_jsonb(old) - allowed) then
		raise exception 'a leader may only change the contact details on their own profile'
			using errcode = '42501';
	end if;
	return new;
end;
$$;

drop trigger if exists guard_family_student_scripture_update on student_scriptures;
create trigger guard_family_student_scripture_update
	before update on student_scriptures
	for each row execute function guard_family_student_scripture_update();

drop trigger if exists guard_family_student_essay_update on student_essays;
create trigger guard_family_student_essay_update
	before update on student_essays
	for each row execute function guard_family_student_essay_update();

drop trigger if exists guard_own_leader_profile_update on leader_profiles;
create trigger guard_own_leader_profile_update
	before update on leader_profiles
	for each row execute function guard_own_leader_profile_update();
