-- Asserts the #565 migration's duplicate-name cleanup leaves every event name
-- unique without touching ids or attendance (#567 review).
--
-- The unique index already exists in a migrated database, so it is dropped
-- inside this transaction, duplicates are planted (including a name the
-- cleanup would naively generate), `dedupe_event_names()` -- the function the
-- migration itself runs -- is called twice, and the index is rebuilt. All of
-- it rolls back.

begin;

drop index events_name_unique_normalized;

insert into events (event_id, name, created_at) values
	-- The review's case: appending evt_b's id would collide with evt_c.
	('d-a', 'Joy Bells', '2026-01-01'),
	('d-b', 'Joy Bells', '2026-01-02'),
	('d-c', 'Joy Bells (d-b)', '2026-01-03'),
	-- And the next suffix is taken too, in other case and spacing.
	('d-d', 'joy  BELLS (D-B) (2)', '2026-01-04'),
	-- A third duplicate of the original, with different spacing.
	('d-e', ' joy   bells ', '2026-01-05'),
	-- Ties on created_at fall back to id order.
	('d-f', 'Kids Choir', null),
	('d-g', 'KIDS CHOIR', null);

insert into households (household_id, name) values ('d-hh', 'Dedupe household');
insert into children (child_id, household_id, first_name) values ('d-ch', 'd-hh', 'Synthetic');
insert into attendance (attendance_id, event_id, child_id, date, check_in_at, check_out_at) values
	('d-att', 'd-b', 'd-ch', '2026-01-02', '2026-01-02T15:00:00Z', '2026-01-02T16:00:00Z');

create temporary table d_result (label text, got text, want text) on commit drop;

insert into d_result select 'first pass renames the three later duplicates', dedupe_event_names()::text, '3';
insert into d_result select 'second pass finds nothing to rename', dedupe_event_names()::text, '0';

insert into d_result
	select 'name of ' || event_id, name,
	       case event_id
	           when 'd-a' then 'Joy Bells'
	           when 'd-b' then 'Joy Bells (d-b) (3)'
	           when 'd-c' then 'Joy Bells (d-b)'
	           when 'd-d' then 'joy  BELLS (D-B) (2)'
	           when 'd-e' then 'joy   bells (d-e)'
	           when 'd-f' then 'Kids Choir'
	           when 'd-g' then 'KIDS CHOIR (d-g)'
	       end
	  from events where event_id like 'd-%';

insert into d_result
	select 'normalized names are unique', count(*)::text, '0'
	  from (
		select lower(btrim(regexp_replace(name, '\s+', ' ', 'g')))
		  from events where name is not null
		 group by 1 having count(*) > 1
	  ) clashes;

insert into d_result
	select 'ids and attendance untouched',
	       (select count(*) from events where event_id like 'd-%')::text || '/' ||
	       (select event_id from attendance where attendance_id = 'd-att'),
	       '7/d-b';

do $$
begin
	create unique index events_name_unique_normalized
		on events (lower(btrim(regexp_replace(name, '\s+', ' ', 'g'))));
	insert into d_result values ('unique index builds afterwards', 'ok', 'ok');
exception when others then
	insert into d_result values ('unique index builds afterwards', sqlstate, 'ok');
end
$$;

insert into d_result
	select 'browser roles cannot run the cleanup',
	       (has_function_privilege('authenticated', 'dedupe_event_names()', 'execute')
	        or has_function_privilege('anon', 'dedupe_event_names()', 'execute'))::text,
	       'false';

do $$
declare
	failures text;
	total int;
begin
	select string_agg(format('%s: got %s, want %s', label, got, want), E'\n'), (select count(*) from d_result)
	  into failures, total
	  from d_result where got is distinct from want;
	if failures is not null then
		raise exception E'Event name dedupe checks FAILED:\n%', failures;
	end if;
	raise notice 'Event name dedupe checks passed (% assertions)', total;
end
$$;

rollback;
