-- Asserts `transfer_attendance` moves a child between events correctly (#561).
--
-- Callers are impersonated the way the browser reaches the database (role
-- `authenticated`, claims in `request.jwt.claims`). Every check records a
-- label, what happened and what should have happened; the script fails with
-- the full list of mismatches. Everything runs in one transaction and rolls
-- back.
--
-- Outcomes are SQLSTATEs, or 'ok' for success:
--   42501 refused for permission, P0002 child no longer on that row,
--   22023 invalid destination, 23514 check constraint.

begin;

-- CI's bootstrap has no Supabase default privileges; see check_rls_writes.sql.
grant select, insert, update, delete on attendance, events, children to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures, written as the table owner.
-- ---------------------------------------------------------------------------
--   leader   ...c1  leads t-min by its confirmed address; t-ch is enrolled there
--   other    ...c9  confirmed address for a ministry t-ch is not in
--   guardian ...a1  member of t-ch's household
--   admin    ...ad

insert into registration_cycles (cycle_id, name, start_date, end_date)
	values ('t-cycle', 'Transfer check cycle', '2026-01-01', '2026-12-31');
insert into events (event_id, name) values
	('t-ss', 'Sunday School'), ('t-joy', 'Joy Bells'), ('t-cc', 'Children''s Church');
insert into households (household_id, name) values ('t-hh', 'Transfer household');
insert into children (child_id, household_id, first_name) values
	('t-ch', 't-hh', 'Synthetic'), ('t-ch2', 't-hh', 'Sibling');
insert into user_households (auth_user_id, household_id)
	values ('00000000-0000-0000-0000-0000000000a1', 't-hh');
insert into ministries (ministry_id, code, name) values
	('t-min', 't-min', 'Transfer ministry'), ('t-min-other', 't-other', 'Other ministry');
insert into ministry_accounts (ministry_id, email, is_active) values
	('t-min', 't-led@example.test', true), ('t-min-other', 't-other@example.test', true);
insert into auth.users (id, email, email_confirmed_at) values
	('00000000-0000-0000-0000-0000000000c1', 't-led@example.test', now()),
	('00000000-0000-0000-0000-0000000000c9', 't-other@example.test', now());
insert into ministry_enrollments (enrollment_id, child_id, ministry_id, cycle_id) values
	('t-me', 't-ch', 't-min', 't-cycle'), ('t-me2', 't-ch2', 't-min', 't-cycle');

-- Arrived at Sunday School at 9:00 church time today; sibling yesterday, left open.
insert into attendance (attendance_id, event_id, child_id, date, check_in_at, checked_in_by) values
	('t-att', 't-ss', 't-ch', (now() at time zone 'America/New_York')::date,
	 now() - interval '1 hour', 'arrival-staff'),
	('t-att-old', 't-ss', 't-ch2', (now() at time zone 'America/New_York')::date - 1,
	 now() - interval '1 day', 'arrival-staff');

create temporary table t_result (label text, got text, want text) on commit drop;
grant insert, select on t_result to anon, authenticated;
create temporary table t_ids (k text primary key, v text) on commit drop;
grant insert, select on t_ids to anon, authenticated;

-- Run `q`; return 'ok' or the SQLSTATE it failed with. Effects of a
-- successful statement are kept (no rollback): the checks below build on them
-- in order, the way staff would at the door.
create function pg_temp.try_sql(q text) returns text
language plpgsql as $$
begin
	execute q;
	return 'ok';
exception when others then
	return sqlstate;
end;
$$;

create function pg_temp.as_caller(claims text) returns void
language plpgsql as $$
begin
	perform set_config('request.jwt.claims', claims, true);
	execute 'set local role authenticated';
end;
$$;

-- Number of children with an open row today: the "on site" count.
create function pg_temp.on_site() returns int
language sql as $$
	select count(distinct child_id)::int from attendance
	 where check_out_at is null and child_id in ('t-ch', 't-ch2')
	   and date = (now() at time zone 'America/New_York')::date;
$$;

-- ---------------------------------------------------------------------------
-- Refusals first, while t-att is still the open Sunday School row.
-- ---------------------------------------------------------------------------
set local role anon;
insert into t_result values
	('anon: transfer', pg_temp.try_sql($q$select transfer_attendance('t-att', 't-joy')$q$), '42501');
reset role;

select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}');
insert into t_result values
	('guardian: transfer own child', pg_temp.try_sql($q$select transfer_attendance('t-att', 't-joy')$q$), '42501');
reset role;

select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c9","email":"t-other@example.test","role":"authenticated","app_metadata":{}}');
insert into t_result values
	('leader of another ministry: transfer', pg_temp.try_sql($q$select transfer_attendance('t-att', 't-joy')$q$), '42501');
reset role;

select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c1","email":"t-led@example.test","role":"authenticated","app_metadata":{}}');
insert into t_result values
	('leader: unknown attendance id', pg_temp.try_sql($q$select transfer_attendance('t-nope', 't-joy')$q$), '42501'),
	('leader: same event', pg_temp.try_sql($q$select transfer_attendance('t-att', 't-ss')$q$), '22023'),
	('leader: event that is not configured', pg_temp.try_sql($q$select transfer_attendance('t-att', 't-not-an-event')$q$), '22023'),
	('leader: no destination', pg_temp.try_sql($q$select transfer_attendance('t-att', null)$q$), '22023'),
	('leader: yesterday''s open row', pg_temp.try_sql($q$select transfer_attendance('t-att-old', 't-joy')$q$), '22023'),
	('leader: fabricate a transfer link on insert', pg_temp.try_sql($q$insert into attendance (attendance_id, event_id, child_id, date, transferred_from_attendance_id) values ('t-fake', 't-joy', 't-ch2', (now() at time zone 'America/New_York')::date, 't-att')$q$), '42501');
reset role;

-- Every refusal left the original location untouched.
insert into t_result
	select 'refusals leave the source row open and unchanged',
	       (check_out_at is null and checked_out_by is null and transferred_to_attendance_id is null)::text, 'true'
	  from attendance where attendance_id = 't-att';
insert into t_result
	select 'refusals create no rows', count(*)::text, '2' from attendance where child_id in ('t-ch', 't-ch2');

-- ---------------------------------------------------------------------------
-- Sunday School -> Joy Bells, as the leader.
-- ---------------------------------------------------------------------------
insert into t_ids select 'on_site_before', pg_temp.on_site()::text;

select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c1","email":"t-led@example.test","role":"authenticated","app_metadata":{}}');
insert into t_ids select 'joy', transfer_attendance('t-att', 't-joy');
-- A double tap / network retry returns the same row instead of failing.
insert into t_result
	select 'leader: retry returns the same destination', (transfer_attendance('t-att', 't-joy') = v)::text, 'true'
	  from t_ids where k = 'joy';
-- A concurrent transfer elsewhere loses: the row is already closed.
insert into t_result values
	('leader: second transfer of the closed row elsewhere', pg_temp.try_sql($q$select transfer_attendance('t-att', 't-cc')$q$), 'P0002'),
	-- Direct writes cannot rewrite the link or turn the transfer into a pickup.
	('leader: rewrite a transfer link', pg_temp.try_sql($q$update attendance set check_out_at = now(), transferred_to_attendance_id = null where attendance_id = 't-att'$q$), '42501'),
	('leader: check out the transferred-from row', pg_temp.try_sql($q$update attendance set check_out_at = now(), pickup_method = 'PIN', picked_up_by = 'Someone' where attendance_id = 't-att'$q$), '42501');
reset role;

insert into t_result
	select 'on-site count unchanged by the transfer', pg_temp.on_site()::text, v from t_ids where k = 'on_site_before';
insert into t_result
	select 'one open row for the child', count(*)::text, '1'
	  from attendance where child_id = 't-ch' and check_out_at is null;
insert into t_result
	select 'source keeps its arrival and attribution',
	       (s.check_in_at < now() and s.checked_in_by = 'arrival-staff')::text, 'true'
	  from attendance s where s.attendance_id = 't-att';
insert into t_result
	select 'source is closed by the caller, not a pickup',
	       (s.check_out_at = now() and s.checked_out_by = '00000000-0000-0000-0000-0000000000c1'
	        and s.picked_up_by is null and s.pickup_method is null)::text, 'true'
	  from attendance s where s.attendance_id = 't-att';
insert into t_result
	select 'rows are linked both ways',
	       (s.transferred_to_attendance_id = d.attendance_id and d.transferred_from_attendance_id = s.attendance_id)::text, 'true'
	  from attendance s, attendance d, t_ids i
	 where s.attendance_id = 't-att' and i.k = 'joy' and d.attendance_id = i.v;
insert into t_result
	select 'destination is an open Joy Bells check-in by the caller, same day',
	       (d.event_id = 't-joy' and d.check_out_at is null and d.check_in_at = now()
	        and d.checked_in_by = '00000000-0000-0000-0000-0000000000c1' and d.date = s.date)::text, 'true'
	  from attendance s, attendance d, t_ids i
	 where s.attendance_id = 't-att' and i.k = 'joy' and d.attendance_id = i.v;
insert into t_result
	select 'no ministry enrollment changed', count(*)::text, '2'
	  from ministry_enrollments where child_id in ('t-ch', 't-ch2') and ministry_id = 't-min';

-- ---------------------------------------------------------------------------
-- An admin transfers the child back, then the leader does a normal pickup.
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"ADMIN"}}');
insert into t_ids select 'back', transfer_attendance(v, 't-ss') from t_ids where k = 'joy';
insert into t_result values
	('admin: fabricate a transfer link on update', pg_temp.try_sql($q$update attendance set transferred_to_attendance_id = 't-att-old' where attendance_id = 't-att-old'$q$), '42501');
reset role;

insert into t_result
	select 'transfer back opens a new Sunday School row, history kept',
	       (count(*) filter (where event_id = 't-ss') = 2 and count(*) filter (where event_id = 't-joy') = 1
	        and count(*) filter (where check_out_at is null) = 1)::text, 'true'
	  from attendance where child_id = 't-ch';

select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c1","email":"t-led@example.test","role":"authenticated","app_metadata":{}}');
insert into t_result
	select 'leader: normal pickup at the destination',
	       pg_temp.try_sql(format($q$update attendance set check_out_at = now(), pickup_method = 'PIN', picked_up_by = 'Guardian A' where attendance_id = %L$q$, v)), 'ok'
	  from t_ids where k = 'back';
insert into t_result values
	('leader: transfer after pickup', pg_temp.try_sql($q$select transfer_attendance((select v from t_ids where k = 'back'), 't-joy')$q$), 'P0002');
reset role;

insert into t_result
	select 'after pickup the child is not on site', count(*)::text, '0'
	  from attendance where child_id = 't-ch' and check_out_at is null;

-- ---------------------------------------------------------------------------
-- Structural
-- ---------------------------------------------------------------------------
insert into t_result
	select 'anon cannot execute transfer_attendance',
	       has_function_privilege('anon', 'transfer_attendance(text, text)', 'execute')::text, 'false';
insert into t_result
	select 'authenticated can execute transfer_attendance',
	       has_function_privilege('authenticated', 'transfer_attendance(text, text)', 'execute')::text, 'true';

do $$
declare
	failures text;
	total int;
begin
	select string_agg(format('%s: got %s, want %s', label, got, want), E'\n'), (select count(*) from t_result)
	  into failures, total
	  from t_result where got is distinct from want;
	if failures is not null then
		raise exception E'Attendance transfer checks FAILED:\n%', failures;
	end if;
	raise notice 'Attendance transfer checks passed (% assertions)', total;
end
$$;

rollback;
