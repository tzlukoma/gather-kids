-- Reset Fall 2026 registration data for R1 UAT test household only.
-- Use before re-running UAT smoke or Playwright @mutating tests.
--
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
--   -v household_id=7dfcf04f-38ee-4e24-abf4-62e3c9c554b5 \
--   -v fall_2026_id=b68d82e0-9677-4703-a89d-264661c88e97 \
--   -f scripts/db/r1-reset-test-household-cycle.sql

\set ON_ERROR_STOP on

\echo '=== Before reset ==='
SELECT 'registrations' AS kind, count(*) AS n
FROM registrations r
JOIN children c ON c.child_id = r.child_id
WHERE c.household_id = :'household_id'
  AND r.cycle_id = :'fall_2026_id';

SELECT 'ministry_enrollments' AS kind, count(*) AS n
FROM ministry_enrollments me
JOIN children c ON c.child_id = me.child_id
WHERE c.household_id = :'household_id'
  AND me.cycle_id = :'fall_2026_id';

BEGIN;

DELETE FROM ministry_enrollments me
USING children c
WHERE me.child_id = c.child_id
  AND c.household_id = :'household_id'
  AND me.cycle_id = :'fall_2026_id';

DELETE FROM registrations r
USING children c
WHERE r.child_id = c.child_id
  AND c.household_id = :'household_id'
  AND r.cycle_id = :'fall_2026_id';

COMMIT;

\echo '=== After reset ==='
SELECT 'registrations' AS kind, count(*) AS n
FROM registrations r
JOIN children c ON c.child_id = r.child_id
WHERE c.household_id = :'household_id'
  AND r.cycle_id = :'fall_2026_id';

SELECT 'ministry_enrollments' AS kind, count(*) AS n
FROM ministry_enrollments me
JOIN children c ON c.child_id = me.child_id
WHERE c.household_id = :'household_id'
  AND me.cycle_id = :'fall_2026_id';

\echo 'Done. Returning guardian should route to /register on next login.'
