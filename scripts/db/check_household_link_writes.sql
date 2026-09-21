-- `user_households` decides which household a guardian may see: the server
-- reads it to scope attendance, and the household shell reads it to pick the
-- household to render. A browser that can write it can name any household as
-- its own, so the browser roles must hold no write grant on it and RLS must
-- keep reads to the caller's own row.
--
-- Run against a database with every migration applied (the db-fk CI job).
-- Any failure below raises, and `psql -v ON_ERROR_STOP=1` fails the job.

\set ON_ERROR_STOP on

DO $$
BEGIN
	IF NOT (
		SELECT relrowsecurity FROM pg_class
		WHERE oid = 'public.user_households'::regclass
	) THEN
		RAISE EXCEPTION 'user_households has row level security disabled';
	END IF;
END
$$;

DO $$
DECLARE
	grantee text;
	privilege text;
BEGIN
	FOR grantee, privilege IN
		SELECT g.role, p.priv
		FROM unnest(ARRAY['anon', 'authenticated']) AS g(role)
		CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS p(priv)
		WHERE has_table_privilege(g.role, 'public.user_households', p.priv)
	LOOP
		RAISE EXCEPTION
			'% may % public.user_households; the household link must not be browser-writable',
			grantee, privilege;
	END LOOP;
END
$$;

DO $$
BEGIN
	IF has_table_privilege('anon', 'public.user_households', 'SELECT') THEN
		RAISE EXCEPTION 'anon may read public.user_households';
	END IF;
	IF NOT has_table_privilege('authenticated', 'public.user_households', 'SELECT') THEN
		RAISE EXCEPTION
			'authenticated cannot read public.user_households; the household shell needs its own link';
	END IF;
END
$$;

DO $$
DECLARE
	policy_count int;
BEGIN
	SELECT count(*) INTO policy_count
	FROM pg_policies
	WHERE schemaname = 'public'
		AND tablename = 'user_households'
		AND cmd = 'SELECT'
		AND qual LIKE '%auth.uid()%';

	IF policy_count = 0 THEN
		RAISE EXCEPTION
			'no SELECT policy on user_households restricts rows to auth.uid()';
	END IF;
END
$$;

SELECT 'user_households write protection checks passed' AS result;
