-- R1 Phase 3: post-registration assertions (run after Playwright submit)
-- psql vars: household_id, fall_2026_id

\set ON_ERROR_STOP on

\echo '=== Fall 2026 registrations for test household ==='
SELECT count(*) AS reg_2026
FROM registrations r
JOIN children c ON c.child_id = r.child_id
WHERE c.household_id = :'household_id'
  AND r.cycle_id = :'fall_2026_id';

\echo '=== Duplicate enrollments (expect 0 rows) ==='
SELECT child_id, ministry_id, count(*) AS cnt
FROM ministry_enrollments
WHERE cycle_id = :'fall_2026_id'
  AND child_id IN (
    SELECT child_id FROM children WHERE household_id = :'household_id'
  )
GROUP BY 1, 2
HAVING count(*) > 1;

\echo '=== Fall 2026 enrollment count for test household ==='
SELECT count(*) AS enroll_2026
FROM ministry_enrollments me
JOIN children c ON c.child_id = me.child_id
WHERE c.household_id = :'household_id'
  AND me.cycle_id = :'fall_2026_id';
