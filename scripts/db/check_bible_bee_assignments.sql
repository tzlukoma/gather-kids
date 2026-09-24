-- Asserts `ensure_student_assignments` creates a child's Bible Bee rows for
-- the callers who may cause them, and for no one else.
--
-- Families may not write Bible Bee records (#527), so the rows a child's page
-- needs are created by the database from the child's enrollments. This checks
-- who can make that happen and exactly which rows appear. It impersonates each
-- caller the way the browser does, counts as the table owner, and rolls back.

begin;

-- Fixtures, written as the table owner.
insert into registration_cycles (cycle_id, name, start_date, end_date) values ('bba-cycle', 'Assignments check cycle', '2026-01-01', '2026-12-31')
	on conflict do nothing;
insert into ministries (ministry_id, code, name) values ('bba-min-bb', 'bible-bee', 'Bible Bee (check)');
insert into ministries (ministry_id, code, name) values ('bba-min-other', 'bba-other', 'Another ministry (check)');
insert into ministry_accounts (ministry_id, email, is_active) values
	('bba-min-bb', 'bba-bible-bee@example.test', true),
	('bba-min-other', 'bba-other@example.test', true);
insert into auth.users (id, email, email_confirmed_at) values
	('00000000-0000-0000-0000-0000000000b1', 'bba-bible-bee@example.test', now()),
	('00000000-0000-0000-0000-0000000000b2', 'bba-other@example.test', now());

insert into households (household_id, name) values
	('bba-hh-own', 'Own household'), ('bba-hh-other', 'Other household');
insert into children (child_id, household_id) values
	('bba-ch-own', 'bba-hh-own'), ('bba-ch-other', 'bba-hh-other');
insert into user_households (auth_user_id, household_id) values
	('00000000-0000-0000-0000-0000000000a1', 'bba-hh-own');

insert into bible_bee_cycles (id, cycle_id, name) values
	('00000000-0000-0000-0000-00000000c001', 'bba-cycle', 'BB check cycle');
insert into divisions (id, bible_bee_cycle_id, name, min_grade, max_grade) values
	('00000000-0000-0000-0000-00000000d001', '00000000-0000-0000-0000-00000000c001', 'Junior', 3, 5);
insert into scriptures (id, bible_bee_cycle_id, reference, texts, "order") values
	('00000000-0000-0000-0000-00000000e001', '00000000-0000-0000-0000-00000000c001', 'Ref 1', '{}', 1),
	('00000000-0000-0000-0000-00000000e002', '00000000-0000-0000-0000-00000000c001', 'Ref 2', '{}', 2);
-- Two prompts for one division, the later one inserted first: the function
-- must pick by its own order, not by whatever the table returns.
insert into essay_prompts (id, bible_bee_cycle_id, division_id, title, prompt, created_at) values
	('00000000-0000-0000-0000-00000000f002', '00000000-0000-0000-0000-00000000c001',
	 '00000000-0000-0000-0000-00000000d001', 'Later', 'p', now()),
	('00000000-0000-0000-0000-00000000f001', '00000000-0000-0000-0000-00000000c001',
	 '00000000-0000-0000-0000-00000000d001', 'Earlier', 'p', now() - interval '1 day');
insert into bible_bee_enrollments (bible_bee_cycle_id, child_id, division_id) values
	('00000000-0000-0000-0000-00000000c001', 'bba-ch-own', '00000000-0000-0000-0000-00000000d001'),
	('00000000-0000-0000-0000-00000000c001', 'bba-ch-other', '00000000-0000-0000-0000-00000000d001');

create temporary table bba_probe (label text, got bigint, want bigint) on commit drop;

-- Each block: act as a caller, then count as the owner.

-- A signed-in stranger: nothing, and no error that would confirm the id.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a9","role":"authenticated","app_metadata":{}}';
select ensure_student_assignments('bba-ch-own');
reset role;
insert into bba_probe select 'stranger: scripture rows', count(*), 0 from student_scriptures where child_id = 'bba-ch-own';
insert into bba_probe select 'stranger: essay rows', count(*), 0 from student_essays where child_id = 'bba-ch-own';

-- A leader of some other ministry: nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b2","email":"bba-other@example.test","role":"authenticated","app_metadata":{}}';
select ensure_student_assignments('bba-ch-own');
reset role;
insert into bba_probe select 'other ministry leader: scripture rows', count(*), 0 from student_scriptures where child_id = 'bba-ch-own';

-- A guardian of another household asking for this child: nothing.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}';
select ensure_student_assignments('bba-ch-other');
reset role;
insert into bba_probe select 'guardian, other child: scripture rows', count(*), 0 from student_scriptures where child_id = 'bba-ch-other';

-- The child's own guardian: one row per scripture, one essay on the earliest prompt.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}';
select ensure_student_assignments('bba-ch-own');
-- Twice: opening the page again must change nothing.
select ensure_student_assignments('bba-ch-own');
reset role;
insert into bba_probe select 'own guardian: scripture rows', count(*), 2 from student_scriptures where child_id = 'bba-ch-own';
insert into bba_probe select 'own guardian: rows start not completed', count(*), 0 from student_scriptures where child_id = 'bba-ch-own' and is_completed;
insert into bba_probe select 'own guardian: essay rows', count(*), 1 from student_essays where child_id = 'bba-ch-own';
insert into bba_probe select 'own guardian: essay on the earliest prompt', count(*), 1 from student_essays
	where child_id = 'bba-ch-own' and essay_prompt_id = '00000000-0000-0000-0000-00000000f001' and status = 'assigned';

-- An essay already on the other prompt of the division: no second essay.
delete from student_essays where child_id = 'bba-ch-own';
insert into student_essays (child_id, bible_bee_cycle_id, essay_prompt_id) values
	('bba-ch-own', '00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-00000000f002');
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}';
select ensure_student_assignments('bba-ch-own');
reset role;
insert into bba_probe select 'existing essay on another prompt: no second essay', count(*), 1 from student_essays where child_id = 'bba-ch-own';

-- The Bible Bee leader, identified by email as the app does: rows for any child.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000b1","email":"bba-bible-bee@example.test","role":"authenticated","app_metadata":{}}';
select ensure_student_assignments('bba-ch-other');
reset role;
insert into bba_probe select 'Bible Bee leader: scripture rows', count(*), 2 from student_scriptures where child_id = 'bba-ch-other';

-- An admin, and the server, likewise.
delete from student_scriptures where child_id = 'bba-ch-other';
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"ADMIN"}}';
select ensure_student_assignments('bba-ch-other');
reset role;
insert into bba_probe select 'admin: scripture rows', count(*), 2 from student_scriptures where child_id = 'bba-ch-other';

delete from student_scriptures where child_id = 'bba-ch-other';
set local request.jwt.claims = '{"role":"service_role"}';
select ensure_student_assignments('bba-ch-other');
insert into bba_probe select 'server: scripture rows', count(*), 2 from student_scriptures where child_id = 'bba-ch-other';

-- Only the function is granted; the browser cannot reach the tables through it
-- in any other way.
insert into bba_probe
	select 'execute not granted to anon', count(*), 0
	  from information_schema.routine_privileges
	 where routine_name = 'ensure_student_assignments' and grantee in ('anon', 'PUBLIC');

do $$
declare
	failures text;
	total int;
begin
	select string_agg(format('%s: got %s, want %s', label, got, want), E'\n'), (select count(*) from bba_probe)
	  into failures, total
	  from bba_probe where got <> want;
	if failures is not null then
		raise exception E'Bible Bee assignment checks FAILED:\n%', failures;
	end if;
	raise notice 'Bible Bee assignment checks passed (% assertions)', total;
end
$$;

rollback;
