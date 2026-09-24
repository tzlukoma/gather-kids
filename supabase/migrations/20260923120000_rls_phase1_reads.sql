-- Phase 1 of #495: make reads enforced by the database rather than by the app.
--
-- Until now 33 tables in UAT carried no row level security and granted `anon`
-- and `authenticated` full select/insert/update/delete. Signed in as an
-- ordinary guardian, the browser could read every child, household and guardian
-- in the deployment. The app asked only for the right rows; nothing made it.
--
-- **This migration changes reads only.** Enabling RLS would otherwise deny
-- writes too, and writes cannot be scoped yet: registration creates the
-- household, its guardians and its children from the browser *before* the
-- `user_households` link exists, so a "your own household" write policy has
-- nothing to test against at the moment those rows are written. #496 moves
-- household creation to the server and is the prerequisite. Until it lands,
-- every table here keeps a permissive insert/update/delete policy that leaves
-- write behaviour exactly as it is today. Those policies are placeholders, they
-- are named so, and #496 replaces them.
--
-- Per-command policies are deliberate: a single `for all using (true)` policy
-- would be OR'd with the select policy below and undo it.

-- ---------------------------------------------------------------------------
-- Who is asking
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER so these run as the owner and are not themselves filtered by
-- the policies that call them — without it, a policy on `children` that needs
-- the caller's children would recurse. They read only the mapping tables, never
-- the table being guarded.
--
-- The role comes from `app_metadata` in the validated JWT, which only the
-- service role can write. Note the JWT also carries a top-level `role` claim
-- whose value is `authenticated` — that is the Postgres role, not the app role.
-- Reading the wrong one admits everybody.

create or replace function app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'GUEST');
$$;

create or replace function app_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select app_role() = 'ADMIN';
$$;

-- Households the caller may see: their own if a guardian, the households of
-- children in their ministries if a leader, all if an admin.
create or replace function app_household_ids()
returns table (household_id text)
language sql
stable
security definer
set search_path = public
as $$
  select h.household_id from households h where app_is_admin()
  union
  select uh.household_id
    from user_households uh
   where uh.auth_user_id = auth.uid()::text
  union
  select c.household_id
    from children c
    join ministry_enrollments me on me.child_id = c.child_id
    join leader_assignments la on la.ministry_id = me.ministry_id
   where la.leader_id = auth.uid()::text
     and coalesce(la.is_active, true)
     and c.household_id is not null;
$$;

-- Children the caller may see.
create or replace function app_child_ids()
returns table (child_id text)
language sql
stable
security definer
set search_path = public
as $$
  select c.child_id
    from children c
   where c.household_id in (select household_id from app_household_ids());
$$;

grant execute on function app_role() to authenticated;
grant execute on function app_is_admin() to authenticated;
grant execute on function app_household_ids() to authenticated;
grant execute on function app_child_ids() to authenticated;

-- ---------------------------------------------------------------------------
-- Tier A — reference data: no personal information, readable by any signed-in
-- user. `branding_settings` is also readable by `anon`, because the church's
-- logo and colours render on /login, /create-account, /register and the 404
-- page, all of which a signed-out visitor sees.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  reference_tables text[] := array[
    'bible_bee_cycles','competition_years','divisions','essay_prompts','events',
    'grade_rules','ministries','ministry_groups','ministry_group_members',
    'registration_cycles','scriptures','branding_settings'
  ];
begin
  foreach t in array reference_tables loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_select', t);
    execute format(
      'create policy %I on %I for select to authenticated using (true)',
      t || '_select', t);

    -- Placeholder write policies: #496 replaces these. They reproduce today's
    -- behaviour so this migration cannot break a write path.
    execute format('drop policy if exists %I on %I', t || '_insert_todo_496', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (true)',
      t || '_insert_todo_496', t);
    execute format('drop policy if exists %I on %I', t || '_update_todo_496', t);
    execute format(
      'create policy %I on %I for update to authenticated using (true) with check (true)',
      t || '_update_todo_496', t);
    execute format('drop policy if exists %I on %I', t || '_delete_todo_496', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (true)',
      t || '_delete_todo_496', t);
  end loop;
end
$$;

-- Signed-out pages need the branding row.
drop policy if exists branding_settings_select_anon on branding_settings;
create policy branding_settings_select_anon
on branding_settings for select to anon using (true);

-- ---------------------------------------------------------------------------
-- Tier B — family data. A guardian sees their own household, a leader sees the
-- children enrolled in the ministries they are assigned to, an admin sees all.
-- Every table here hangs off either `household_id` or `child_id`, so the two
-- helper functions above carry the whole tier.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  by_household text[] := array['households','children','guardians','emergency_contacts'];
  by_child     text[] := array['registrations','child_year_profiles','ministry_enrollments',
                               'bible_bee_enrollments','student_scriptures','student_essays',
                               'attendance','enrollment_overrides'];
begin
  foreach t in array by_household || by_child loop
    execute format('alter table %I enable row level security', t);

    execute format('drop policy if exists %I on %I', t || '_select', t);
    if t = any(by_household) then
      execute format(
        'create policy %I on %I for select to authenticated
           using (household_id in (select household_id from app_household_ids()))',
        t || '_select', t);
    else
      execute format(
        'create policy %I on %I for select to authenticated
           using (child_id in (select child_id from app_child_ids()))',
        t || '_select', t);
    end if;

    execute format('drop policy if exists %I on %I', t || '_insert_todo_496', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (true)',
      t || '_insert_todo_496', t);
    execute format('drop policy if exists %I on %I', t || '_update_todo_496', t);
    execute format(
      'create policy %I on %I for update to authenticated using (true) with check (true)',
      t || '_update_todo_496', t);
    execute format('drop policy if exists %I on %I', t || '_delete_todo_496', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (true)',
      t || '_delete_todo_496', t);
  end loop;
end
$$;

-- `incidents` keeps the rule the app already applies in `getIncidentsForUser`:
-- an admin sees every incident, anyone else sees the ones they logged. The
-- child scope is added so a guardian can see an incident about their own child.
alter table incidents enable row level security;
drop policy if exists incidents_select on incidents;
create policy incidents_select
on incidents for select to authenticated
using (
  app_is_admin()
  or leader_id = auth.uid()::text
  or child_id in (select child_id from app_child_ids())
);
drop policy if exists incidents_insert_todo_496 on incidents;
create policy incidents_insert_todo_496
on incidents for insert to authenticated with check (true);
drop policy if exists incidents_update_todo_496 on incidents;
create policy incidents_update_todo_496
on incidents for update to authenticated using (true) with check (true);
drop policy if exists incidents_delete_todo_496 on incidents;
create policy incidents_delete_todo_496
on incidents for delete to authenticated using (true);

-- ---------------------------------------------------------------------------
-- Tier C — staff records. These are not family data, but they are not public
-- either: `users` carries every staff email, and `leader_assignments` is what
-- decides a leader's scope in tier B, so leaving it readable hands an attacker
-- the map of who can see what.
--
-- A leader may read their own row and their own assignments, because the app
-- resolves the signed-in leader's ministries in the browser. Everything else
-- is admin-only.
-- ---------------------------------------------------------------------------

alter table users enable row level security;
drop policy if exists users_select on users;
create policy users_select
on users for select to authenticated
using (app_is_admin() or user_id = auth.uid()::text);

alter table leader_assignments enable row level security;
drop policy if exists leader_assignments_select on leader_assignments;
create policy leader_assignments_select
on leader_assignments for select to authenticated
using (app_is_admin() or leader_id = auth.uid()::text);

-- `leader_profiles.leader_id` is `uuid`; every other identity column in this
-- schema (`users.user_id`, `leader_assignments.leader_id`, `incidents.leader_id`,
-- `user_households.auth_user_id`) is `text`. Comparing this one against
-- `auth.uid()::text` fails outright with "operator does not exist: uuid = text",
-- which is the good case — the silent one would be a policy that never matches.
alter table leader_profiles enable row level security;
drop policy if exists leader_profiles_select on leader_profiles;
create policy leader_profiles_select
on leader_profiles for select to authenticated
using (app_is_admin() or leader_id = auth.uid());

-- No guardian or leader screen reads these two. Admin only.
alter table ministry_accounts enable row level security;
drop policy if exists ministry_accounts_select on ministry_accounts;
create policy ministry_accounts_select
on ministry_accounts for select to authenticated
using (app_is_admin());

alter table daily_digest_checkpoints enable row level security;
drop policy if exists daily_digest_checkpoints_select on daily_digest_checkpoints;
create policy daily_digest_checkpoints_select
on daily_digest_checkpoints for select to authenticated
using (app_is_admin());

do $$
declare
  t text;
begin
  foreach t in array array['users','leader_assignments','leader_profiles',
                           'ministry_accounts','daily_digest_checkpoints'] loop
    execute format('drop policy if exists %I on %I', t || '_insert_todo_496', t);
    execute format(
      'create policy %I on %I for insert to authenticated with check (true)',
      t || '_insert_todo_496', t);
    execute format('drop policy if exists %I on %I', t || '_update_todo_496', t);
    execute format(
      'create policy %I on %I for update to authenticated using (true) with check (true)',
      t || '_update_todo_496', t);
    execute format('drop policy if exists %I on %I', t || '_delete_todo_496', t);
    execute format(
      'create policy %I on %I for delete to authenticated using (true)',
      t || '_delete_todo_496', t);
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- Orphans. `ministry_leaders` and `timeslots` exist in UAT and not in local or
-- in any migration: no migration creates them and none drops them. Nothing in
-- the application reads either — `ministry_leaders` appears only as a string
-- literal in `src/lib/dal/branding.ts`, whose data comes from `leader_profiles`,
-- and `timeslots` was superseded by the `events.timeslots` column added in
-- `0010_add_timeslots_to_events`. Both were empty when checked in UAT.
--
-- So they get the strictest treatment available rather than a policy: no
-- browser access at all. Dropping them is a separate decision and does not
-- belong in a security migration.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['ministry_leaders','timeslots'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table %I enable row level security', t);
      execute format('revoke all on %I from anon', t);
      execute format('revoke all on %I from authenticated', t);
    end if;
  end loop;
end
$$;
