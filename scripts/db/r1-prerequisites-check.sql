-- R1 Phase 0 prerequisite validation
-- Usage:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/db/r1-prerequisites-check.sql
--
-- Optional (override defaults):
--   psql ... -v fall_2025_id=uuid -v fall_2026_id=uuid -f scripts/db/r1-prerequisites-check.sql

\set ON_ERROR_STOP on
\if :{?fall_2025_id}
\else
\set fall_2025_id ''
\endif
\if :{?fall_2026_id}
\else
\set fall_2026_id ''
\endif

-- psql substitutes :'name' before the query runs; empty -v values become empty strings.
SELECT jsonb_pretty(r1_prerequisite_report) AS r1_prerequisite_report
FROM (
  WITH params AS (
    SELECT
      coalesce(
        nullif(trim(:'fall_2025_id'), ''),
        'e3a387b5-de59-4e37-a52a-b9e9102dc45c'
      )::text AS fall_2025_id,
      nullif(trim(:'fall_2026_id'), '')::text AS fall_2026_id
  ),
  uat_baseline AS (
    SELECT
      (SELECT count(*) FROM households) AS household_count,
      (SELECT count(*) FROM children WHERE is_active = true) AS active_child_count,
      (SELECT count(*) FROM user_households) AS user_household_link_count,
      (SELECT count(*) FROM registration_cycles WHERE is_active = true) AS active_cycle_count,
      (SELECT count(*) FROM registration_cycles WHERE name = 'Fall 2025') AS fall_2025_named_count
  ),
  fall_2025 AS (
    SELECT
      rc.cycle_id,
      rc.name,
      rc.is_active,
      rc.start_date,
      rc.end_date,
      (SELECT count(*) FROM registrations r WHERE r.cycle_id = rc.cycle_id) AS registration_count,
      (SELECT count(*) FROM ministry_enrollments me WHERE me.cycle_id = rc.cycle_id) AS enrollment_count
    FROM registration_cycles rc
    CROSS JOIN params p
    WHERE rc.cycle_id = p.fall_2025_id
  ),
  fall_2026 AS (
    SELECT
      rc.cycle_id,
      rc.name,
      rc.is_active,
      rc.start_date,
      rc.end_date
    FROM registration_cycles rc
    CROSS JOIN params p
    WHERE rc.name = 'Fall 2026'
       OR (p.fall_2026_id IS NOT NULL AND rc.cycle_id = p.fall_2026_id)
    ORDER BY rc.created_at DESC NULLS LAST
    LIMIT 1
  ),
  empty_shells AS (
    SELECT count(*) AS empty_household_shells
    FROM households h
    WHERE NOT EXISTS (SELECT 1 FROM children c WHERE c.household_id = h.household_id)
      AND NOT EXISTS (SELECT 1 FROM guardians g WHERE g.household_id = h.household_id)
  ),
  grade_mix AS (
    SELECT coalesce(nullif(trim(grade), ''), '(blank)') AS grade, count(*) AS n
    FROM children
    GROUP BY 1
    ORDER BY n DESC
    LIMIT 10
  ),
  checks AS (
    SELECT
      (SELECT household_count FROM uat_baseline) >= 50 AS enough_households,
      (SELECT active_child_count FROM uat_baseline) >= 90 AS enough_children,
      (SELECT user_household_link_count FROM uat_baseline) >= 50 AS enough_auth_links,
      (SELECT active_cycle_count FROM uat_baseline) = 1 AS exactly_one_active_cycle,
      (SELECT fall_2025_named_count FROM uat_baseline) >= 1 AS fall_2025_exists,
      EXISTS (SELECT 1 FROM fall_2025) AS fall_2025_id_found,
      coalesce((SELECT is_active FROM fall_2025 LIMIT 1), false) AS fall_2025_is_active,
      EXISTS (SELECT 1 FROM fall_2026) AS fall_2026_exists,
      coalesce((SELECT is_active FROM fall_2026 LIMIT 1), true) = false AS fall_2026_is_inactive,
      coalesce(
        (SELECT f26.start_date FROM fall_2026 f26),
        '1900-01-01'::date
      ) > coalesce(
        (SELECT f25.start_date FROM fall_2025 f25),
        '2099-01-01'::date
      ) AS fall_2026_starts_after_2025
  )
  SELECT jsonb_build_object(
    'phase0_pass',
      (
        SELECT bool_and(flag)
        FROM checks c,
        LATERAL unnest(ARRAY[
          c.enough_households,
          c.enough_children,
          c.enough_auth_links,
          c.exactly_one_active_cycle,
          c.fall_2025_exists,
          c.fall_2025_id_found,
          c.fall_2025_is_active,
          c.fall_2026_exists,
          c.fall_2026_is_inactive,
          c.fall_2026_starts_after_2025
        ]) AS flag
      ),
    'checks', (SELECT to_jsonb(c) FROM checks c),
    'uat_baseline', (SELECT to_jsonb(u) FROM uat_baseline u),
    'fall_2025', (SELECT to_jsonb(f) FROM fall_2025 f),
    'fall_2026', (SELECT coalesce(to_jsonb(f), '{}'::jsonb) FROM fall_2026 f),
    'empty_household_shells', (SELECT empty_household_shells FROM empty_shells),
    'top_grades', (SELECT coalesce(jsonb_agg(to_jsonb(g)), '[]'::jsonb) FROM grade_mix g),
    'hint',
      CASE
        WHEN NOT (SELECT fall_2026_exists FROM checks)
          THEN 'Run P0.3: INSERT Fall 2026 cycle (inactive).'
        WHEN NOT (SELECT enough_households FROM checks)
          THEN 'Restore prod-shaped data to UAT (P0.2).'
        WHEN NOT (SELECT exactly_one_active_cycle FROM checks)
          THEN 'Ensure exactly one registration_cycles row has is_active=true.'
        WHEN (
          SELECT bool_and(flag)
          FROM checks c,
          LATERAL unnest(ARRAY[
            c.enough_households,
            c.enough_children,
            c.enough_auth_links,
            c.exactly_one_active_cycle,
            c.fall_2025_exists,
            c.fall_2025_id_found,
            c.fall_2025_is_active,
            c.fall_2026_exists,
            c.fall_2026_is_inactive,
            c.fall_2026_starts_after_2025
          ]) AS flag
        )
          THEN 'Phase 0 DB checks passed.'
        ELSE 'One or more checks failed — inspect the checks object.'
      END
  ) AS r1_prerequisite_report
) report;
