-- Asserts the phase 2 WRITE policies decide correctly (#527).
--
-- Each probe attempts one real write as an impersonated caller, the way the
-- browser does, inside a subtransaction that is always rolled back, and
-- records what happened:
--
--   n  -- the write went through and touched n rows
--   0  -- the policy hid the row (UPDATE/DELETE find nothing to touch)
--  -1  -- the write was refused for permission (42501: WITH CHECK or a
--         column guard)
--  -2  -- it failed for any other reason. No assertion wants this: it means a
--         probe tripped a constraint instead of a policy, and would otherwise
--         pass as a refusal for the wrong reason.
--
-- Probes are independent: none sees another's effect. The whole check runs
-- in one transaction and rolls back.
--
-- The case that motivated all of this is here by name: a ministry leader who
-- can READ a household through enrollment must not be able to rename it or
-- delete its guardians.

begin;

-- Supabase grants anon/authenticated full table privileges through
-- pg_default_acl; CI's bootstrap has none. Without these, every probe below
-- would fail on permissions before a policy was consulted, and the refusals
-- would pass for the wrong reason.
grant select, insert, update, delete on
	households, guardians, emergency_contacts, children, registrations,
	child_year_profiles, ministry_enrollments, attendance, incidents,
	bible_bee_enrollments, enrollment_overrides, student_scriptures, student_essays,
	bible_bee_cycles, divisions, scriptures, essay_prompts, competition_years,
	branding_settings, events, grade_rules, ministries, ministry_groups,
	ministry_group_members, registration_cycles, users, leader_assignments,
	ministry_accounts, leader_profiles, daily_digest_checkpoints
	to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures, written as the table owner.
-- ---------------------------------------------------------------------------
--   guardian A  ...a1  member of w-hh-a (child w-ch-a)
--   guardian B  ...a2  member of w-hh-b (child w-ch-b)
--   leader      ...c1  leads w-min-led by its confirmed address; w-ch-led is enrolled there.
--                      Also a parent: member of w-hh-c (child w-ch-c).
--   stood-down  ...c2  inactive assignment to w-min-led
--   BB leader   ...c3  leads the bible-bee ministry by its confirmed address
--   admin       ...ad

insert into registration_cycles (cycle_id, name, start_date, end_date)
	values ('w-cycle', 'Write check cycle', '2026-01-01', '2026-12-31');
insert into events (event_id, name) values ('w-event', 'Write check event');

insert into households (household_id, name) values
	('w-hh-a', 'Household A'), ('w-hh-b', 'Household B'), ('w-hh-led', 'Household in a led ministry'),
	('w-hh-c', 'The leader''s own household');
insert into children (child_id, household_id, first_name) values
	('w-ch-a', 'w-hh-a', 'A'), ('w-ch-b', 'w-hh-b', 'B'), ('w-ch-led', 'w-hh-led', 'Led'),
	('w-ch-c', 'w-hh-c', 'Leader''s child');
insert into guardians (guardian_id, household_id, first_name) values
	('w-g-a', 'w-hh-a', 'Guardian A'), ('w-g-b', 'w-hh-b', 'Guardian B'), ('w-g-led', 'w-hh-led', 'Guardian Led');
insert into user_households (auth_user_id, household_id) values
	('00000000-0000-0000-0000-0000000000a1', 'w-hh-a'),
	('00000000-0000-0000-0000-0000000000a2', 'w-hh-b'),
	('00000000-0000-0000-0000-0000000000c1', 'w-hh-c');

insert into ministries (ministry_id, code, name) values
	('w-min-led', 'w-led', 'Led ministry'), ('w-min-bb', 'bible-bee', 'Bible Bee (write check)'),
	-- No address yet: `ministry_accounts.ministry_id` is unique, so claiming an
	-- address has to aim at a ministry without one.
	('w-min-free', 'w-free', 'Ministry with no address');
insert into ministry_accounts (ministry_id, email, is_active) values
	('w-min-led', 'w-led@example.test', true), ('w-min-bb', 'w-bb@example.test', true);
insert into auth.users (id, email, email_confirmed_at) values
	('00000000-0000-0000-0000-0000000000c1', 'w-led@example.test', now()),
	('00000000-0000-0000-0000-0000000000c3', 'w-bb@example.test', now());
insert into leader_assignments (assignment_id, leader_id, ministry_id, cycle_id, is_active) values
	('w-la-stood-down', '00000000-0000-0000-0000-0000000000c2', 'w-min-led', 'w-cycle', false);
insert into ministry_enrollments (enrollment_id, child_id, ministry_id, cycle_id) values
	('w-me-led', 'w-ch-led', 'w-min-led', 'w-cycle'),
	('w-me-a', 'w-ch-a', 'w-min-bb', 'w-cycle');
insert into leader_profiles (leader_id, first_name, email, is_active) values
	('00000000-0000-0000-0000-0000000000c1', 'Leader', 'w-led@example.test', true),
	('00000000-0000-0000-0000-0000000000c2', 'Other leader', 'w-other@example.test', true);

insert into attendance (attendance_id, event_id, child_id, date) values
	('w-att-led', 'w-event', 'w-ch-led', current_date);
insert into incidents (incident_id, child_id, leader_id, description) values
	('w-inc-led', 'w-ch-led', '00000000-0000-0000-0000-0000000000c1', 'scraped knee');

insert into bible_bee_cycles (id, cycle_id, name) values
	('00000000-0000-0000-0000-00000000c0c0', 'w-cycle', 'BB write cycle');
insert into divisions (id, bible_bee_cycle_id, name, min_grade, max_grade) values
	('00000000-0000-0000-0000-00000000d0d0', '00000000-0000-0000-0000-00000000c0c0', 'Div', 0, 12);
insert into scriptures (id, bible_bee_cycle_id, reference, texts, "order") values
	('00000000-0000-0000-0000-00000000e0e1', '00000000-0000-0000-0000-00000000c0c0', 'Ref 1', '{}', 1),
	('00000000-0000-0000-0000-00000000e0e2', '00000000-0000-0000-0000-00000000c0c0', 'Ref 2', '{}', 2);
insert into essay_prompts (id, bible_bee_cycle_id, division_id, title, prompt) values
	('00000000-0000-0000-0000-00000000f0f0', '00000000-0000-0000-0000-00000000c0c0',
	 '00000000-0000-0000-0000-00000000d0d0', 'Prompt', 'p'),
	('00000000-0000-0000-0000-00000000f0f1', '00000000-0000-0000-0000-00000000c0c0',
	 '00000000-0000-0000-0000-00000000d0d0', 'Second prompt', 'p'),
	('00000000-0000-0000-0000-00000000f0f2', '00000000-0000-0000-0000-00000000c0c0',
	 '00000000-0000-0000-0000-00000000d0d0', 'Unused prompt', 'p');
-- Child A is left unenrolled so enrolling A can succeed or be refused on
-- policy alone rather than on the (cycle, child) unique key.
insert into bible_bee_enrollments (bible_bee_cycle_id, child_id, division_id) values
	('00000000-0000-0000-0000-00000000c0c0', 'w-ch-b', '00000000-0000-0000-0000-00000000d0d0');
insert into student_scriptures (id, bible_bee_cycle_id, child_id, scripture_id) values
	('00000000-0000-0000-0000-0000000055a1', '00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000e0e1'),
	('00000000-0000-0000-0000-0000000055b1', '00000000-0000-0000-0000-00000000c0c0', 'w-ch-b', '00000000-0000-0000-0000-00000000e0e1');
-- `status` is constrained to 'assigned' or 'submitted'; one of each.
insert into student_essays (id, bible_bee_cycle_id, child_id, essay_prompt_id, status) values
	('00000000-0000-0000-0000-00000000e55a', '00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000f0f0', 'assigned'),
	('00000000-0000-0000-0000-00000000e55b', '00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000f0f1', 'submitted');

-- ---------------------------------------------------------------------------
-- The probe
-- ---------------------------------------------------------------------------

create temporary table w_probe (label text, got int, want int) on commit drop;
grant insert on w_probe to anon, authenticated;

create function pg_temp.try_write(q text) returns int
language plpgsql as $$
declare
	n int;
begin
	begin
		execute q;
		get diagnostics n = row_count;
		-- Undo it, carrying the count out through the exception.
		raise exception using errcode = 'P0001', message = 'w-probe:' || n;
	exception when others then
		if sqlerrm like 'w-probe:%' then
			return substring(sqlerrm from 9)::int;
		end if;
		if sqlstate = '42501' then
			return -1;
		end if;
		raise notice 'w-probe: % failed with % (%)', q, sqlstate, sqlerrm;
		return -2;
	end;
end;
$$;

create function pg_temp.as_caller(claims text) returns void
language plpgsql as $$
begin
	perform set_config('request.jwt.claims', claims, true);
	execute 'set local role authenticated';
end;
$$;

-- ---------------------------------------------------------------------------
-- Guardian A
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}');
insert into w_probe values
	('guardian: rename own household',              pg_temp.try_write($q$update households set name = 'x' where household_id = 'w-hh-a'$q$), 1),
	('guardian: rename another household',          pg_temp.try_write($q$update households set name = 'x' where household_id = 'w-hh-b'$q$), 0),
	('guardian: create a household directly',       pg_temp.try_write($q$insert into households (household_id, name) values ('w-hh-new', 'x')$q$), -1),
	('guardian: delete own household',              pg_temp.try_write($q$delete from households where household_id = 'w-hh-a'$q$), 0),
	('guardian: add guardian to own household',     pg_temp.try_write($q$insert into guardians (guardian_id, household_id) values ('w-g-new', 'w-hh-a')$q$), 1),
	('guardian: add guardian to another household', pg_temp.try_write($q$insert into guardians (guardian_id, household_id) values ('w-g-new', 'w-hh-b')$q$), -1),
	('guardian: delete another household''s guardian', pg_temp.try_write($q$delete from guardians where guardian_id = 'w-g-b'$q$), 0),
	('guardian: delete own guardian row',           pg_temp.try_write($q$delete from guardians where guardian_id = 'w-g-a'$q$), 1),
	('guardian: move own child to another household', pg_temp.try_write($q$update children set household_id = 'w-hh-b' where child_id = 'w-ch-a'$q$), -1),
	('guardian: register own child',                pg_temp.try_write($q$insert into registrations (registration_id, child_id, cycle_id) values ('w-r-new', 'w-ch-a', 'w-cycle')$q$), 1),
	('guardian: register another child',            pg_temp.try_write($q$insert into registrations (registration_id, child_id, cycle_id) values ('w-r-new', 'w-ch-b', 'w-cycle')$q$), -1),
	('guardian: enroll own child in a ministry',    pg_temp.try_write($q$insert into ministry_enrollments (enrollment_id, child_id, ministry_id) values ('w-me-new', 'w-ch-a', 'w-min-led')$q$), 1),
	('guardian: check in own child',                pg_temp.try_write($q$insert into attendance (attendance_id, event_id, child_id) values ('w-att-new', 'w-event', 'w-ch-a')$q$), -1),
	('guardian: log an incident',                   pg_temp.try_write($q$insert into incidents (incident_id, child_id, leader_id) values ('w-inc-new', 'w-ch-a', '00000000-0000-0000-0000-0000000000a1')$q$), -1),
	('guardian: enroll own child in Bible Bee',     pg_temp.try_write($q$insert into bible_bee_enrollments (bible_bee_cycle_id, child_id, division_id) values ('00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000d0d0')$q$), -1),
	('guardian: create a scripture assignment',     pg_temp.try_write($q$insert into student_scriptures (bible_bee_cycle_id, child_id, scripture_id) values ('00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000e0e2')$q$), -1),
	('guardian: mark own child''s scripture complete', pg_temp.try_write($q$update student_scriptures set is_completed = true, completed_at = now() where id = '00000000-0000-0000-0000-0000000055a1'$q$), 1),
	('guardian: repoint own child''s scripture',    pg_temp.try_write($q$update student_scriptures set scripture_id = '00000000-0000-0000-0000-00000000e0e2' where id = '00000000-0000-0000-0000-0000000055a1'$q$), -1),
	('guardian: mark another child''s scripture',   pg_temp.try_write($q$update student_scriptures set is_completed = true where id = '00000000-0000-0000-0000-0000000055b1'$q$), 0),
	('guardian: submit own child''s essay',         pg_temp.try_write($q$update student_essays set status = 'submitted', submitted_at = now() where id = '00000000-0000-0000-0000-00000000e55a'$q$), 1),
	('guardian: reopen own child''s submitted essay', pg_temp.try_write($q$update student_essays set status = 'assigned' where id = '00000000-0000-0000-0000-00000000e55b'$q$), -1),
	('guardian: repoint own child''s essay prompt', pg_temp.try_write($q$update student_essays set essay_prompt_id = '00000000-0000-0000-0000-00000000f0f2' where id = '00000000-0000-0000-0000-00000000e55a'$q$), -1),
	('guardian: edit a ministry',                   pg_temp.try_write($q$update ministries set name = 'x' where ministry_id = 'w-min-led'$q$), 0),
	('guardian: claim a ministry address',         pg_temp.try_write($q$insert into ministry_accounts (ministry_id, email) values ('w-min-free', 'mine@example.test')$q$), -1),
	('guardian: assign self to a ministry',         pg_temp.try_write($q$insert into leader_assignments (assignment_id, leader_id, ministry_id) values ('w-la-new', '00000000-0000-0000-0000-0000000000a1', 'w-min-led')$q$), -1);
reset role;

-- ---------------------------------------------------------------------------
-- Ministry leader, identified by a confirmed ministry address
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c1","email":"w-led@example.test","role":"authenticated","app_metadata":{}}');
insert into w_probe values
	-- The #527 finding, by name.
	('leader: rename a household they can read',    pg_temp.try_write($q$update households set name = 'PWNED' where household_id = 'w-hh-led'$q$), 0),
	('leader: delete a guardian they can read',     pg_temp.try_write($q$delete from guardians where household_id = 'w-hh-led'$q$), 0),
	('leader: edit a child they can read',          pg_temp.try_write($q$update children set first_name = 'x' where child_id = 'w-ch-led'$q$), 0),
	('leader: add a guardian to a household they read', pg_temp.try_write($q$insert into guardians (guardian_id, household_id) values ('w-g-new', 'w-hh-led')$q$), -1),
	('leader: change a child''s enrollment',        pg_temp.try_write($q$update ministry_enrollments set status = 'x' where enrollment_id = 'w-me-led'$q$), 0),
	('leader: check in a child they serve',         pg_temp.try_write($q$insert into attendance (attendance_id, event_id, child_id) values ('w-att-new', 'w-event', 'w-ch-led')$q$), 1),
	('leader: check out a child they serve',        pg_temp.try_write($q$update attendance set check_out_at = now() where attendance_id = 'w-att-led'$q$), 1),
	('leader: check in a child they do not serve',  pg_temp.try_write($q$insert into attendance (attendance_id, event_id, child_id) values ('w-att-new', 'w-event', 'w-ch-a')$q$), -1),
	('leader: delete attendance',                   pg_temp.try_write($q$delete from attendance where attendance_id = 'w-att-led'$q$), 0),
	('leader: log an incident, own name',           pg_temp.try_write($q$insert into incidents (incident_id, child_id, leader_id) values ('w-inc-new', 'w-ch-led', '00000000-0000-0000-0000-0000000000c1')$q$), 1),
	('leader: log an incident in someone else''s name', pg_temp.try_write($q$insert into incidents (incident_id, child_id, leader_id) values ('w-inc-new', 'w-ch-led', '00000000-0000-0000-0000-0000000000c2')$q$), -1),
	('leader: log an incident, child not served',   pg_temp.try_write($q$insert into incidents (incident_id, child_id, leader_id) values ('w-inc-new', 'w-ch-a', '00000000-0000-0000-0000-0000000000c1')$q$), -1),
	('leader: acknowledge an incident',             pg_temp.try_write($q$update incidents set admin_acknowledged_at = now() where incident_id = 'w-inc-led'$q$), 0),
	('leader: claim another ministry''s address',  pg_temp.try_write($q$insert into ministry_accounts (ministry_id, email) values ('w-min-free', 'w-led@example.test')$q$), -1),
	('leader: assign self to a ministry',           pg_temp.try_write($q$insert into leader_assignments (assignment_id, leader_id, ministry_id) values ('w-la-new', '00000000-0000-0000-0000-0000000000c1', 'w-min-bb')$q$), -1),
	('leader: enroll a child in Bible Bee',         pg_temp.try_write($q$insert into bible_bee_enrollments (bible_bee_cycle_id, child_id, division_id) values ('00000000-0000-0000-0000-00000000c0c0', 'w-ch-led', '00000000-0000-0000-0000-00000000d0d0')$q$), -1),
	-- Leaders are parents too. Their own family is theirs to edit; a household
	-- they only read is not, even as a destination. This is the one case the
	-- SELECT policy does not already cover, so it is what gives the update
	-- policies' WITH CHECK its force.
	('leader-parent: rename own household',         pg_temp.try_write($q$update households set name = 'x' where household_id = 'w-hh-c'$q$), 1),
	('leader-parent: move own child into a household they only read', pg_temp.try_write($q$update children set household_id = 'w-hh-led' where child_id = 'w-ch-c'$q$), -1),
	('leader-parent: re-home a guardian into a household they only read', pg_temp.try_write($q$insert into guardians (guardian_id, household_id) values ('w-g-new', 'w-hh-led')$q$), -1),
	('leader: edit own profile phone',              pg_temp.try_write($q$update leader_profiles set phone = '5551234567', updated_at = now() where leader_id = '00000000-0000-0000-0000-0000000000c1'$q$), 1),
	('leader: reactivate or rename own profile',    pg_temp.try_write($q$update leader_profiles set is_active = false where leader_id = '00000000-0000-0000-0000-0000000000c1'$q$), -1),
	('leader: edit another leader''s profile',      pg_temp.try_write($q$update leader_profiles set phone = '5551234567' where leader_id = '00000000-0000-0000-0000-0000000000c2'$q$), 0),
	-- With no WHERE clause the statement reads no columns, so Postgres applies
	-- only the UPDATE policy, not the SELECT one. This is the probe that tests
	-- the update policy on its own; the one above would pass without it.
	('leader: blanket update reaches only own profile', pg_temp.try_write($q$update leader_profiles set phone = '5551234567'$q$), 1);
reset role;

-- An assignment that has been stood down grants nothing.
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c2","role":"authenticated","app_metadata":{"role":"MINISTRY_LEADER"}}');
insert into w_probe values
	('stood-down leader: check in a child',         pg_temp.try_write($q$insert into attendance (attendance_id, event_id, child_id) values ('w-att-new', 'w-event', 'w-ch-led')$q$), -1);
reset role;

-- ---------------------------------------------------------------------------
-- Bible Bee leader
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c3","email":"w-bb@example.test","role":"authenticated","app_metadata":{}}');
insert into w_probe values
	('Bible Bee leader: enroll a child',            pg_temp.try_write($q$insert into bible_bee_enrollments (bible_bee_cycle_id, child_id, division_id) values ('00000000-0000-0000-0000-00000000c0c0', 'w-ch-led', '00000000-0000-0000-0000-00000000d0d0')$q$), 1),
	('Bible Bee leader: enroll child A',            pg_temp.try_write($q$insert into bible_bee_enrollments (bible_bee_cycle_id, child_id, division_id) values ('00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000d0d0')$q$), 1),
	('Bible Bee leader: create a scripture assignment', pg_temp.try_write($q$insert into student_scriptures (bible_bee_cycle_id, child_id, scripture_id) values ('00000000-0000-0000-0000-00000000c0c0', 'w-ch-a', '00000000-0000-0000-0000-00000000e0e2')$q$), 1),
	('Bible Bee leader: repoint an essay prompt',   pg_temp.try_write($q$update student_essays set essay_prompt_id = '00000000-0000-0000-0000-00000000f0f2' where id = '00000000-0000-0000-0000-00000000e55a'$q$), 1),
	('Bible Bee leader: add a scripture',           pg_temp.try_write($q$insert into scriptures (bible_bee_cycle_id, reference, texts, "order") values ('00000000-0000-0000-0000-00000000c0c0', 'Ref 3', '{}', 3)$q$), 1),
	-- Child A is signed up for the Bible Bee ministry, so the leader can see
	-- (and therefore reach) A's rows; an UPDATE only touches rows the caller
	-- can read.
	('Bible Bee leader: repoint an assignment',     pg_temp.try_write($q$update student_scriptures set scripture_id = '00000000-0000-0000-0000-00000000e0e2' where id = '00000000-0000-0000-0000-0000000055a1'$q$), 1),
	('Bible Bee leader: reopen a submitted essay',  pg_temp.try_write($q$update student_essays set status = 'assigned' where id = '00000000-0000-0000-0000-00000000e55b'$q$), 1),
	('Bible Bee leader: add a division override',   pg_temp.try_write($q$insert into enrollment_overrides (id, child_id, bible_bee_cycle_id, division_id) values (gen_random_uuid(), 'w-ch-a', '00000000-0000-0000-0000-00000000c0c0', '00000000-0000-0000-0000-00000000d0d0')$q$), 1),
	('Bible Bee leader: rename a household',        pg_temp.try_write($q$update households set name = 'x' where household_id = 'w-hh-a'$q$), 0),
	('Bible Bee leader: edit branding',             pg_temp.try_write($q$update branding_settings set updated_at = now()$q$), 0);
reset role;

-- ---------------------------------------------------------------------------
-- Admin. These give the refusals above their force: a policy that refused
-- everybody would pass every assertion before this block.
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"ADMIN"}}');
insert into w_probe values
	('admin: rename any household',                 pg_temp.try_write($q$update households set name = 'x' where household_id = 'w-hh-led'$q$), 1),
	('admin: create a household',                   pg_temp.try_write($q$insert into households (household_id, name) values ('w-hh-new', 'x')$q$), 1),
	('admin: delete a guardian',                    pg_temp.try_write($q$delete from guardians where guardian_id = 'w-g-b'$q$), 1),
	('admin: delete attendance',                    pg_temp.try_write($q$delete from attendance where attendance_id = 'w-att-led'$q$), 1),
	('admin: acknowledge an incident',              pg_temp.try_write($q$update incidents set admin_acknowledged_at = now() where incident_id = 'w-inc-led'$q$), 1),
	('admin: edit a ministry',                      pg_temp.try_write($q$update ministries set name = 'x' where ministry_id = 'w-min-led'$q$), 1),
	('admin: give a ministry its address',          pg_temp.try_write($q$insert into ministry_accounts (ministry_id, email) values ('w-min-free', 'w-free@example.test')$q$), 1),
	('admin: move a child between households',      pg_temp.try_write($q$update children set household_id = 'w-hh-b' where child_id = 'w-ch-a'$q$), 1),
	('admin: assign a leader',                      pg_temp.try_write($q$insert into leader_assignments (assignment_id, leader_id, ministry_id) values ('w-la-new', '00000000-0000-0000-0000-0000000000c1', 'w-min-bb')$q$), 1),
	('admin: stand a leader down',                  pg_temp.try_write($q$update leader_profiles set is_active = false where leader_id = '00000000-0000-0000-0000-0000000000c1'$q$), 1),
	('admin: reopen a submitted essay',             pg_temp.try_write($q$update student_essays set status = 'assigned' where id = '00000000-0000-0000-0000-00000000e55b'$q$), 1);
reset role;

-- ---------------------------------------------------------------------------
-- Signed out
-- ---------------------------------------------------------------------------
set local role anon;
set local request.jwt.claims = '';
insert into w_probe values
	('anon: add a guardian',                        pg_temp.try_write($q$insert into guardians (guardian_id, household_id) values ('w-g-new', 'w-hh-a')$q$), -1),
	('anon: rename a household',                    pg_temp.try_write($q$update households set name = 'x' where household_id = 'w-hh-a'$q$), 0);
reset role;

-- ---------------------------------------------------------------------------
-- Structural: no placeholder survives, and no write policy is open to all.
-- ---------------------------------------------------------------------------
insert into w_probe
	select 'no placeholder write policy remains', count(*)::int, 0
	  from pg_policies where schemaname = 'public' and policyname like '%todo_496';
insert into w_probe
	select 'no write policy admits everyone', count(*)::int, 0
	  from pg_policies
	 where schemaname = 'public'
	   and cmd in ('INSERT', 'UPDATE', 'DELETE')
	   and (coalesce(qual, 'true') = 'true' and coalesce(with_check, 'true') = 'true')
	   -- keepalive is write-only by design and predates this work.
	   and tablename <> 'keepalive';

do $$
declare
	failures text;
	total int;
begin
	select string_agg(format('%s: got %s, want %s', label, got, want), E'\n'), (select count(*) from w_probe)
	  into failures, total
	  from w_probe where got is distinct from want;
	if failures is not null then
		raise exception E'RLS write policy checks FAILED:\n%', failures;
	end if;
	raise notice 'RLS write policy checks passed (% assertions)', total;
end
$$;

rollback;
