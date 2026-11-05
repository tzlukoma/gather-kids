-- Check-in event management (#565).
--
-- Admins create, rename, archive and delete check-in events in the app. The
-- `events` table already decides who may write it (admins only, phase 2 RLS);
-- this migration adds what the table itself must guarantee:
--
--   * `archived_at` -- an archived event stays in the table, so its id, name
--     and every attendance row that points at it are kept and stay
--     reportable. It just takes no new check-ins.
--   * An event that has attendance history cannot be deleted. Until now
--     `attendance.event_id` cascaded on delete, so deleting an event silently
--     deleted every attendance row for it. That is now refused: archive it
--     instead. An event with no history can still be deleted.
--   * An archived event cannot receive a child -- not by a check-in, not by a
--     transfer (`transfer_attendance` inserts, so the same guard applies), and
--     not by an edit that moves a row onto it. Checking a child out of, or
--     transferring them out of, an archived event is untouched.
--   * A new or renamed event must have a non-blank name.
--
-- Attendance is event attendance, not ministry enrollment. Nothing here
-- touches `ministry_enrollments`.
--
-- Do not apply this to UAT or production from an agent session.

alter table events add column if not exists archived_at timestamptz;

-- A name is what every picker shows. NOT VALID: existing rows are not
-- re-checked (they predate this rule); every insert and update from now on is.
alter table events drop constraint if exists events_name_not_blank;
alter table events add constraint events_name_not_blank
	check (name is not null and btrim(name) <> '') not valid;

-- ---------------------------------------------------------------------------
-- Deleting an event never deletes attendance.
-- ---------------------------------------------------------------------------

-- The clear refusal. A BEFORE DELETE trigger runs before any foreign-key
-- action, so it holds whatever the constraint below looks like in a given
-- environment.
create or replace function guard_event_delete_with_history()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if exists (select 1 from attendance where event_id = old.event_id) then
		raise exception 'this event has attendance history and cannot be deleted; archive it instead'
			using errcode = '23503';
	end if;
	return old;
end;
$$;

drop trigger if exists guard_event_delete_with_history on events;
create trigger guard_event_delete_with_history
	before delete on events
	for each row execute function guard_event_delete_with_history();

-- And the structural one: replace any cascading foreign key from
-- `attendance.event_id` to `events` with one that refuses. Found by shape, not
-- by name, so an environment whose constraint was named differently is
-- covered too. NOT VALID so that a legacy orphan row cannot block the
-- migration; the constraint is enforced for every new row and every delete.
do $$
declare
	fk record;
begin
	for fk in
		select c.conname
		  from pg_constraint c
		  join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
		 where c.contype = 'f'
		   and c.conrelid = 'public.attendance'::regclass
		   and c.confrelid = 'public.events'::regclass
		   and a.attname = 'event_id'
		   and c.confdeltype = 'c'
	loop
		execute format('alter table attendance drop constraint %I', fk.conname);
	end loop;

	if not exists (
		select 1 from pg_constraint
		 where contype = 'f'
		   and conrelid = 'public.attendance'::regclass
		   and confrelid = 'public.events'::regclass
	) then
		alter table attendance
			add constraint attendance_event_id_fkey
			foreign key (event_id) references events (event_id)
			on delete restrict
			not valid;
	end if;
end
$$;

-- ---------------------------------------------------------------------------
-- An archived event takes no new children.
-- ---------------------------------------------------------------------------

-- Fires for every caller, the server and security-definer functions included:
-- archived means no new attendance, whoever is writing. An update is checked
-- only when it moves a row onto a different event, so closing a row that is
-- already at an archived event -- a pickup, or the source side of a transfer
-- out -- is unaffected.
create or replace function guard_attendance_archived_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if tg_op = 'UPDATE' and new.event_id is not distinct from old.event_id then
		return new;
	end if;
	if exists (
		select 1 from events where event_id = new.event_id and archived_at is not null
	) then
		raise exception 'that event is archived and is not taking check-ins'
			using errcode = '22023';
	end if;
	return new;
end;
$$;

drop trigger if exists guard_attendance_archived_event on attendance;
create trigger guard_attendance_archived_event
	before insert or update of event_id on attendance
	for each row execute function guard_attendance_archived_event();

-- ---------------------------------------------------------------------------
-- What the admin screen needs to offer the right actions.
-- ---------------------------------------------------------------------------

-- Per event: how many attendance rows it has ever had (any history means it
-- can only be archived) and how many children are on site there today, by
-- the church's calendar day (shown before archiving). Security invoker, so it counts only what the caller may
-- read: an admin sees the whole table, anyone else sees no more than their
-- attendance read policy already allows.
create or replace function event_attendance_summary()
returns table (event_id text, attendance_count bigint, on_site_count bigint)
language sql
stable
security invoker
set search_path = public
as $$
	select e.event_id,
	       count(a.attendance_id) as attendance_count,
	       count(a.attendance_id) filter (
	           where a.check_out_at is null
	             and a.date = (now() at time zone 'America/New_York')::date
	       ) as on_site_count
	  from events e
	  left join attendance a on a.event_id = e.event_id
	 group by e.event_id;
$$;

revoke all on function event_attendance_summary() from public, anon;
grant execute on function event_attendance_summary() to authenticated;
