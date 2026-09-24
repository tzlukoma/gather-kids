-- Bible Bee assignment rows are created by the database, not by whoever is
-- looking at them.
--
-- A child's Bible Bee page creates the child's `student_scriptures` and
-- `student_essays` rows the first time anyone opens it, from the browser, as
-- that viewer. On the family's own page the viewer is the family. #527 decided
-- families may mark their own child's scriptures complete and essays submitted,
-- but may not otherwise write Bible Bee records, so this creation has to move
-- somewhere that does not need the family to hold an insert grant.
--
-- `ensure_student_assignments` creates exactly the rows the page used to:
-- one `student_scriptures` row per scripture in each cycle the child is
-- enrolled in, and one `student_essays` row per enrollment whose division has
-- an essay prompt. Everything is derived from the child's enrollments; the
-- caller supplies only which child. Both inserts are idempotent through the
-- tables' own unique constraints, so opening the page twice changes nothing.
--
-- This migration changes no policy. Under today's permissive write policies it
-- behaves exactly as before; it is what lets the write policies that follow
-- refuse families these inserts without breaking the page.

-- The caller leads the Bible Bee ministry. Mirrors `canLeaderManageBibleBee`
-- in `src/lib/dal/leaders.ts`, which gates the Bible Bee management screens.
create or replace function app_is_bible_bee_leader()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		  from ministries m
		 where m.code = 'bible-bee'
		   and m.ministry_id in (select ministry_id from app_leader_ministry_ids())
	);
$$;

-- Supabase grants execute on new functions to `anon` through its default
-- privileges, which revoking from `public` does not touch.
revoke all on function app_is_bible_bee_leader() from public, anon;
grant execute on function app_is_bible_bee_leader() to authenticated;

create or replace function ensure_student_assignments(p_child_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	-- Who may cause this child's rows to exist: the server, an admin, a Bible
	-- Bee leader, or a member of the child's own household. For anyone else it
	-- does nothing, and says nothing: raising would tell a caller which child
	-- ids exist, and a viewer who may only read the page should still see it.
	if not (
		coalesce(auth.jwt() ->> 'role', '') = 'service_role'
		or app_is_admin()
		or app_is_bible_bee_leader()
		or exists (
			select 1
			  from children c
			  join user_households uh on uh.household_id = c.household_id
			 where c.child_id = p_child_id
			   and uh.auth_user_id = auth.uid()::text
		)
	) then
		return;
	end if;

	insert into student_scriptures (child_id, bible_bee_cycle_id, scripture_id, is_completed)
	select e.child_id, e.bible_bee_cycle_id, s.id, false
	  from bible_bee_enrollments e
	  join scriptures s on s.bible_bee_cycle_id = e.bible_bee_cycle_id
	 where e.child_id = p_child_id
	on conflict (bible_bee_cycle_id, child_id, scripture_id) do nothing;

	-- One essay per enrollment, against the division's earliest prompt, and
	-- only if the child has no essay for any of that division's prompts yet.
	-- The page used to take whichever prompt the query returned first, which
	-- is unordered; a fixed order keeps a second prompt from forking a second
	-- essay.
	insert into student_essays (child_id, bible_bee_cycle_id, essay_prompt_id, status)
	select e.child_id, e.bible_bee_cycle_id, p.id, 'assigned'
	  from bible_bee_enrollments e
	 cross join lateral (
		select ep.id
		  from essay_prompts ep
		 where ep.division_id = e.division_id
		   and ep.bible_bee_cycle_id = e.bible_bee_cycle_id
		 order by ep.created_at nulls last, ep.id
		 limit 1
	 ) p
	 where e.child_id = p_child_id
	   and not exists (
		select 1
		  from student_essays se
		  join essay_prompts ep2 on ep2.id = se.essay_prompt_id
		 where se.child_id = e.child_id
		   and se.bible_bee_cycle_id = e.bible_bee_cycle_id
		   and ep2.division_id = e.division_id
	   )
	on conflict (child_id, essay_prompt_id) do nothing;
end;
$$;

revoke all on function ensure_student_assignments(text) from public, anon;
grant execute on function ensure_student_assignments(text) to authenticated, service_role;
