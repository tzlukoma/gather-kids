-- Scope writes to `avatars` to the people the app lets manage each avatar (#529).
--
-- `avatars` holds one image per entity: a child's photo today, and from #529
-- the signed-in user's own profile photo (`entity_type = 'user'`, keyed by
-- their auth id). Its write policies admitted any signed-in caller for any
-- row. These match the app's own rules in `src/lib/permissions.ts`:
--
--   child  -- `canUpdateChildPhoto`: an admin, or a member of the child's
--             household. Membership is `user_households`, the same trusted
--             source phase 2 uses (#527), not the role claim the browser
--             checks.
--   user   -- `canUpdateUserAvatar`: the user themselves.
--   other  -- nothing in the app writes `guardian` or `leader` rows; admins
--             only.
--
-- Admins may write any row. Reads are unchanged: any signed-in caller.
--
-- UPDATE checks the rule before and after, so a row cannot be re-pointed at an
-- entity the caller does not manage.

create or replace function app_can_manage_avatar(p_entity_type text, p_entity_id text)
returns boolean
language sql
stable
set search_path = public
as $$
	select app_is_admin()
		or (p_entity_type = 'child'
			and p_entity_id in (select child_id from app_member_child_ids()))
		or (p_entity_type = 'user'
			and p_entity_id = auth.uid()::text);
$$;

drop policy if exists authenticated_users_insert_avatars on avatars;
drop policy if exists authenticated_users_update_avatars on avatars;
drop policy if exists authenticated_users_delete_avatars on avatars;

drop policy if exists avatars_insert on avatars;
create policy avatars_insert on avatars
	for insert to authenticated
	with check (app_can_manage_avatar(entity_type, entity_id));

drop policy if exists avatars_update on avatars;
create policy avatars_update on avatars
	for update to authenticated
	using (app_can_manage_avatar(entity_type, entity_id))
	with check (app_can_manage_avatar(entity_type, entity_id));

drop policy if exists avatars_delete on avatars;
create policy avatars_delete on avatars
	for delete to authenticated
	using (app_can_manage_avatar(entity_type, entity_id));
