-- Transfer a checked-in child between events (#561).
--
-- A transfer closes the child's open attendance row at the source event and
-- opens one at the destination, in one statement the caller cannot split. The
-- two rows are linked both ways, so:
--
--   * the original arrival and the source event's attendance stay on record
--     (the source row keeps its check_in_at; nothing is overwritten);
--   * a row closed by a transfer can be told apart from a pickup: it has
--     `transferred_to_attendance_id` set and, by constraint, no pickup details;
--   * exactly one row stays open, so the child stays on site and the on-site
--     count does not move (the one-open-check-in index from #482 still holds);
--   * the destination row is an ordinary check-in, so pickup there goes
--     through the normal check-out and its verification.
--
-- Who and when are stamped by the database: `checked_out_by` on the source
-- row and `checked_in_by` on the destination are the authenticated caller,
-- and both times are the server's.
--
-- Attendance is event attendance, not ministry enrollment. Nothing here
-- touches `ministry_enrollments`.
--
-- Do not apply this to UAT or production from an agent session.

alter table attendance
	add column if not exists transferred_to_attendance_id text references attendance (attendance_id),
	add column if not exists transferred_from_attendance_id text references attendance (attendance_id);

-- A row is the source of at most one transfer and the destination of at most
-- one. This is what makes a second, concurrent transfer of the same row fail
-- rather than fork the child into two events.
create unique index if not exists attendance_transferred_to_once
	on attendance (transferred_to_attendance_id)
	where transferred_to_attendance_id is not null;
create unique index if not exists attendance_transferred_from_once
	on attendance (transferred_from_attendance_id)
	where transferred_from_attendance_id is not null;

-- A transfer is not a pickup. A row closed by a transfer carries no pickup
-- details, so an export or a later "check-out" cannot make it look like a
-- guardian collected the child at the source event.
alter table attendance drop constraint if exists attendance_transfer_is_not_a_pickup;
alter table attendance add constraint attendance_transfer_is_not_a_pickup check (
	transferred_to_attendance_id is null
	or (check_out_at is not null and picked_up_by is null and pickup_method is null)
);

-- The links are written by `transfer_attendance` only. A browser session --
-- admins included -- cannot fabricate or rewrite them with a direct write.
-- Like the other attendance guards this steps aside for the server and for
-- security-definer functions, which do not run as `authenticated`.
create or replace function guard_attendance_transfer_links()
returns trigger
language plpgsql
set search_path = public
as $$
begin
	if current_user <> 'authenticated' then
		return new;
	end if;
	if tg_op = 'INSERT' then
		if new.transferred_to_attendance_id is not null
		   or new.transferred_from_attendance_id is not null then
			raise exception 'a transfer goes through transfer_attendance' using errcode = '42501';
		end if;
	elsif new.transferred_to_attendance_id is distinct from old.transferred_to_attendance_id
	   or new.transferred_from_attendance_id is distinct from old.transferred_from_attendance_id then
		raise exception 'a transfer goes through transfer_attendance' using errcode = '42501';
	end if;
	return new;
end;
$$;

drop trigger if exists guard_attendance_transfer_links on attendance;
create trigger guard_attendance_transfer_links
	before insert or update on attendance
	for each row execute function guard_attendance_transfer_links();

-- Move the child on open attendance row `p_attendance_id` to `p_to_event_id`.
-- Returns the destination row's id.
--
-- Authorization is the attendance write policy's own rule (`led_child`): an
-- admin, or a leader of a ministry the child is enrolled in. It is decided
-- here, from the session, because a security-definer function is not subject
-- to the policy.
--
-- Errors, by SQLSTATE, so the app can say something useful:
--   42501  not signed in, or not allowed to move this child (also used for an
--          unknown attendance id, so the error does not confirm which ids exist)
--   P0002  the child is no longer checked in on that row: already checked out
--          or already moved somewhere else
--   22023  the destination is not a valid choice
--
-- Retries are safe: repeating a transfer that already happened (a double tap,
-- a network retry) returns the same destination row instead of failing, as
-- long as the child is still there. Concurrent calls serialize on the source
-- row's lock; the loser sees the row already closed.
create or replace function transfer_attendance(p_attendance_id text, p_to_event_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
	actor constant text := auth.uid()::text;
	today constant date := (now() at time zone 'America/New_York')::date;
	src attendance%rowtype;
	dest attendance%rowtype;
	dest_id constant text := gen_random_uuid()::text;
begin
	if actor is null then
		raise exception 'sign in to transfer a child' using errcode = '42501';
	end if;

	select * into src from attendance where attendance_id = p_attendance_id for update;

	if not found or not (
		app_is_admin()
		or src.child_id in (select child_id from app_leader_child_ids())
	) then
		raise exception 'you are not allowed to transfer this child' using errcode = '42501';
	end if;

	if src.check_out_at is not null then
		if src.transferred_to_attendance_id is not null then
			select * into dest from attendance where attendance_id = src.transferred_to_attendance_id;
			if found and dest.event_id = p_to_event_id and dest.check_out_at is null then
				return dest.attendance_id;
			end if;
			raise exception 'this child has already been moved to another event' using errcode = 'P0002';
		end if;
		raise exception 'this child has already been checked out' using errcode = 'P0002';
	end if;

	if src.date is distinct from today then
		raise exception 'only today''s check-ins can be transferred' using errcode = '22023';
	end if;
	if p_to_event_id is null or p_to_event_id = src.event_id then
		raise exception 'choose a different event to transfer to' using errcode = '22023';
	end if;
	if not exists (select 1 from events where event_id = p_to_event_id) then
		raise exception 'that event is not set up for check-in' using errcode = '22023';
	end if;

	-- Close the source first: the one-open-check-in index admits the
	-- destination row only once the source is no longer open.
	update attendance
	   set check_out_at = now(),
	       checked_out_by = actor
	 where attendance_id = src.attendance_id;

	insert into attendance (
		attendance_id, event_id, child_id, date, check_in_at, checked_in_by,
		first_time_flag, transferred_from_attendance_id, created_at
	) values (
		dest_id, p_to_event_id, src.child_id, src.date, now(), actor,
		false, src.attendance_id, now()
	);

	update attendance
	   set transferred_to_attendance_id = dest_id
	 where attendance_id = src.attendance_id;

	return dest_id;
end;
$$;

-- Supabase grants execute on new functions to `anon` through its default
-- privileges, which revoking from `public` does not touch.
revoke all on function transfer_attendance(text, text) from public, anon;
grant execute on function transfer_attendance(text, text) to authenticated;
