-- Asserts check-in event management behaves at the data boundary (#565).
--
-- Each probe runs one statement as an impersonated caller (role
-- `authenticated`, claims in `request.jwt.claims`), inside a subtransaction
-- that is always undone, and records the outcome:
--
--   ok:n   the statement succeeded and touched n rows (0 = RLS hid the row)
--   XXXXX  it failed with that SQLSTATE
--            42501 permission, 23503 event has history, 22023 archived event,
--            23514 blank name
--
-- Probes are independent: none sees another's effect. The whole check runs in
-- one transaction and rolls back.

begin;

-- CI's bootstrap has no Supabase default privileges; see check_rls_writes.sql.
grant select, insert, update, delete on events, attendance to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Fixtures, written as the table owner.
-- ---------------------------------------------------------------------------
--   admin    ...ad
--   leader   ...c1  leads m-min by its confirmed address; m-ch is enrolled there
--   guardian ...a1  member of m-ch's household
--
--   m-used   has attendance history (a closed row from last week)
--   m-empty  has never had attendance
--   m-arch   archived, with m-ch still checked in there today
--   m-open   an ordinary active event

insert into registration_cycles (cycle_id, name, start_date, end_date)
	values ('m-cycle', 'Event check cycle', '2026-01-01', '2026-12-31');
insert into events (event_id, name) values
	('m-used', 'Used event'), ('m-empty', 'Empty event'),
	('m-arch', 'Archived event'), ('m-open', 'Open event');
insert into households (household_id, name) values ('m-hh', 'Event household');
insert into children (child_id, household_id, first_name) values
	('m-ch', 'm-hh', 'Synthetic'), ('m-ch2', 'm-hh', 'Sibling');
insert into user_households (auth_user_id, household_id)
	values ('00000000-0000-0000-0000-0000000000a1', 'm-hh');
insert into ministries (ministry_id, code, name) values ('m-min', 'm-min', 'Event ministry');
insert into ministry_accounts (ministry_id, email, is_active) values ('m-min', 'm-led@example.test', true);
insert into auth.users (id, email, email_confirmed_at)
	values ('00000000-0000-0000-0000-0000000000c1', 'm-led@example.test', now());
insert into ministry_enrollments (enrollment_id, child_id, ministry_id, cycle_id) values
	('m-me', 'm-ch', 'm-min', 'm-cycle'), ('m-me2', 'm-ch2', 'm-min', 'm-cycle');

insert into attendance (attendance_id, event_id, child_id, date, check_in_at, check_out_at) values
	('m-att-history', 'm-used', 'm-ch2', (now() at time zone 'America/New_York')::date - 7, now() - interval '7 days', now() - interval '7 days'),
	('m-att-arch', 'm-arch', 'm-ch', (now() at time zone 'America/New_York')::date, now() - interval '1 hour', null);
-- Archived after the child arrived: the case that must not strand anyone.
update events set archived_at = now() where event_id = 'm-arch';

create temporary table m_result (label text, got text, want text) on commit drop;
grant insert, select on m_result to anon, authenticated;

create function pg_temp.try_sql(q text) returns text
language plpgsql as $$
declare
	n int;
begin
	begin
		execute q;
		get diagnostics n = row_count;
		raise exception using errcode = 'P0001', message = 'm-probe:' || n;
	exception when others then
		if sqlerrm like 'm-probe:%' then
			return 'ok:' || substring(sqlerrm from 9);
		end if;
		return sqlstate;
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
-- Admin
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"ADMIN"}}');
insert into m_result values
	('admin: create an event',                pg_temp.try_sql($q$insert into events (event_id, name) values ('m-new', 'Joy Bells')$q$), 'ok:1'),
	('admin: create an event with a blank name', pg_temp.try_sql($q$insert into events (event_id, name) values ('m-new', '   ')$q$), '23514'),
	('admin: create an event with no name',   pg_temp.try_sql($q$insert into events (event_id) values ('m-new')$q$), '23514'),
	('admin: rename an event',                pg_temp.try_sql($q$update events set name = 'Renamed' where event_id = 'm-used'$q$), 'ok:1'),
	('admin: rename an event to blank',       pg_temp.try_sql($q$update events set name = '' where event_id = 'm-used'$q$), '23514'),
	('admin: archive an event with history',  pg_temp.try_sql($q$update events set archived_at = now() where event_id = 'm-used'$q$), 'ok:1'),
	('admin: archive an event without history', pg_temp.try_sql($q$update events set archived_at = now() where event_id = 'm-empty'$q$), 'ok:1'),
	('admin: restore an archived event',      pg_temp.try_sql($q$update events set archived_at = null where event_id = 'm-arch'$q$), 'ok:1'),
	('admin: delete an event with history',   pg_temp.try_sql($q$delete from events where event_id = 'm-used'$q$), '23503'),
	('admin: delete an archived event that has a child on site', pg_temp.try_sql($q$delete from events where event_id = 'm-arch'$q$), '23503'),
	('admin: delete an event without history', pg_temp.try_sql($q$delete from events where event_id = 'm-empty'$q$), 'ok:1'),
	-- Archived means no new children, admins included.
	('admin: check a child in to an archived event', pg_temp.try_sql($q$insert into attendance (attendance_id, event_id, child_id, date) values ('m-att-new', 'm-arch', 'm-ch2', (now() at time zone 'America/New_York')::date)$q$), '22023'),
	('admin: move a row onto an archived event', pg_temp.try_sql($q$update attendance set event_id = 'm-arch' where attendance_id = 'm-att-history'$q$), '22023'),
	('admin: transfer a child out of an archived event', pg_temp.try_sql($q$select transfer_attendance('m-att-arch', 'm-open')$q$), 'ok:1');
reset role;

-- ---------------------------------------------------------------------------
-- Ministry leader of the child's ministry
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c1","email":"m-led@example.test","role":"authenticated","app_metadata":{}}');
insert into m_result values
	('leader: create an event',               pg_temp.try_sql($q$insert into events (event_id, name) values ('m-new', 'x')$q$), '42501'),
	('leader: rename an event',               pg_temp.try_sql($q$update events set name = 'x' where event_id = 'm-used'$q$), 'ok:0'),
	('leader: archive an event',              pg_temp.try_sql($q$update events set archived_at = now() where event_id = 'm-open'$q$), 'ok:0'),
	('leader: delete an event without history', pg_temp.try_sql($q$delete from events where event_id = 'm-empty'$q$), 'ok:0'),
	-- The door: nothing new goes into an archived event, and a child already
	-- there can still leave normally.
	('leader: check a child in to an archived event', pg_temp.try_sql($q$insert into attendance (attendance_id, event_id, child_id, date) values ('m-att-new', 'm-arch', 'm-ch2', (now() at time zone 'America/New_York')::date)$q$), '22023'),
	('leader: check a child in to an active event', pg_temp.try_sql($q$insert into attendance (attendance_id, event_id, child_id, date) values ('m-att-new', 'm-open', 'm-ch2', (now() at time zone 'America/New_York')::date)$q$), 'ok:1'),
	('leader: check a child out of an archived event', pg_temp.try_sql($q$update attendance set check_out_at = now(), pickup_method = 'PIN', picked_up_by = 'Guardian' where attendance_id = 'm-att-arch'$q$), 'ok:1'),
	('leader: transfer a child out of an archived event', pg_temp.try_sql($q$select transfer_attendance('m-att-arch', 'm-open')$q$), 'ok:1');
reset role;

-- A transfer into an archived event is refused and changes nothing: the
-- function is atomic, so the source row it closed first is reopened.
create function pg_temp.try_transfer_into_archive() returns text
language plpgsql as $$
begin
	perform transfer_attendance('m-att-new-src', 'm-arch');
	return 'ok';
exception when others then
	return sqlstate;
end;
$$;
insert into attendance (attendance_id, event_id, child_id, date, check_in_at)
	values ('m-att-new-src', 'm-open', 'm-ch2', (now() at time zone 'America/New_York')::date, now());
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000c1","email":"m-led@example.test","role":"authenticated","app_metadata":{}}');
insert into m_result select 'leader: refused transfer into an archive', pg_temp.try_transfer_into_archive(), '22023';
reset role;
insert into m_result
	select 'refused transfer leaves the source open and unlinked',
	       (check_out_at is null and transferred_to_attendance_id is null)::text, 'true'
	  from attendance where attendance_id = 'm-att-new-src';
delete from attendance where attendance_id = 'm-att-new-src';

-- ---------------------------------------------------------------------------
-- Guardian and anon
-- ---------------------------------------------------------------------------
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated","app_metadata":{"role":"GUARDIAN"}}');
insert into m_result values
	('guardian: create an event',             pg_temp.try_sql($q$insert into events (event_id, name) values ('m-new', 'x')$q$), '42501'),
	('guardian: rename an event',             pg_temp.try_sql($q$update events set name = 'x' where event_id = 'm-used'$q$), 'ok:0'),
	('guardian: delete an event',             pg_temp.try_sql($q$delete from events where event_id = 'm-empty'$q$), 'ok:0');
reset role;

set local role anon;
set local request.jwt.claims = '';
insert into m_result values
	('anon: create an event',                 pg_temp.try_sql($q$insert into events (event_id, name) values ('m-new', 'x')$q$), '42501'),
	('anon: rename an event',                 pg_temp.try_sql($q$update events set name = 'x' where event_id = 'm-used'$q$), 'ok:0'),
	('anon: summary',                         pg_temp.try_sql($q$select * from event_attendance_summary()$q$), '42501');
reset role;

-- ---------------------------------------------------------------------------
-- State after all the probes (each was undone): nothing lost.
-- ---------------------------------------------------------------------------
insert into m_result
	select 'attendance history intact after the refused deletes', count(*)::text, '2'
	  from attendance where attendance_id in ('m-att-history', 'm-att-arch');
insert into m_result
	select 'no event was deleted', count(*)::text, '4' from events where event_id like 'm-%';

-- The summary the admin screen reads, as an admin.
select pg_temp.as_caller('{"sub":"00000000-0000-0000-0000-0000000000ad","role":"authenticated","app_metadata":{"role":"ADMIN"}}');
insert into m_result
	select 'summary: ' || event_id, attendance_count || '/' || on_site_count,
	       case event_id when 'm-used' then '1/0' when 'm-arch' then '1/1' else '0/0' end
	  from event_attendance_summary() where event_id like 'm-%';
reset role;

-- Structural: the cascade is gone.
insert into m_result
	select 'no cascading delete from events to attendance', count(*)::text, '0'
	  from pg_constraint
	 where contype = 'f' and conrelid = 'attendance'::regclass
	   and confrelid = 'events'::regclass and confdeltype = 'c';

do $$
declare
	failures text;
	total int;
begin
	select string_agg(format('%s: got %s, want %s', label, got, want), E'\n'), (select count(*) from m_result)
	  into failures, total
	  from m_result where got is distinct from want;
	if failures is not null then
		raise exception E'Event management checks FAILED:\n%', failures;
	end if;
	raise notice 'Event management checks passed (% assertions)', total;
end
$$;

rollback;
