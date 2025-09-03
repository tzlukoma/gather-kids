-- This SQL script checks for the existence of all required tables
-- Run this after table setup to verify all tables are present

SELECT table_name, 
      (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Special checks for known tables
SELECT 'bible_bee_years exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'bible_bee_years' AND table_schema = 'public'
) AS exists;

SELECT 'branding_settings exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'branding_settings' AND table_schema = 'public'
) AS exists;

SELECT 'child_year_profiles exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'child_year_profiles' AND table_schema = 'public'
) AS exists;

SELECT 'children exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'children' AND table_schema = 'public'
) AS exists;

SELECT 'competition_years exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'competition_years' AND table_schema = 'public'
) AS exists;

SELECT 'divisions exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'divisions' AND table_schema = 'public'
) AS exists;

SELECT 'enrollment_overrides exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'enrollment_overrides' AND table_schema = 'public'
) AS exists;

SELECT 'essay_prompts exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'essay_prompts' AND table_schema = 'public'
) AS exists;

SELECT 'events exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'events' AND table_schema = 'public'
) AS exists;

SELECT 'guardians exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'guardians' AND table_schema = 'public'
) AS exists;

SELECT 'households exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'households' AND table_schema = 'public'
) AS exists;

SELECT 'incidents exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'incidents' AND table_schema = 'public'
) AS exists;

SELECT 'leader_assignments exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'leader_assignments' AND table_schema = 'public'
) AS exists;

SELECT 'ministries exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'ministries' AND table_schema = 'public'
) AS exists;

SELECT 'ministry_leaders exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'ministry_leaders' AND table_schema = 'public'
) AS exists;

SELECT 'registrations exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'registrations' AND table_schema = 'public'
) AS exists;

SELECT 'scriptures exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'scriptures' AND table_schema = 'public'
) AS exists;

SELECT 'timeslots exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'timeslots' AND table_schema = 'public'
) AS exists;

SELECT 'users exists' AS check_result, EXISTS (
  SELECT 1 FROM information_schema.tables 
  WHERE table_name = 'users' AND table_schema = 'public'
) AS exists;

-- Check for foreign key constraints on ministry_leaders
SELECT 'ministry_leaders_ministry_id_fkey exists' AS constraint_check,
EXISTS (
  SELECT 1 FROM information_schema.table_constraints 
  WHERE constraint_name = 'ministry_leaders_ministry_id_fkey'
    AND table_name = 'ministry_leaders'
) AS exists;

SELECT 'ministry_leaders_user_id_fkey exists' AS constraint_check,
EXISTS (
  SELECT 1 FROM information_schema.table_constraints 
  WHERE constraint_name = 'ministry_leaders_user_id_fkey'
    AND table_name = 'ministry_leaders'
) AS exists;
