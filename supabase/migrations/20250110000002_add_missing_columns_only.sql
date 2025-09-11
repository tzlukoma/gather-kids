-- Migration: Add Missing Columns Only
-- 
-- This migration adds only the missing columns identified by the schema audit.
-- It's designed to be safe and idempotent.

BEGIN;

-- ============================================================================
-- HOUSEHOLDS TABLE - Add missing phone column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'households' AND column_name = 'phone' AND table_schema = 'public') THEN
        ALTER TABLE households ADD COLUMN phone text;
        RAISE NOTICE 'Added phone column to households table';
    END IF;
END $$;

-- ============================================================================
-- CHILDREN TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'first_name' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN first_name text;
        RAISE NOTICE 'Added first_name column to children table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'last_name' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN last_name text;
        RAISE NOTICE 'Added last_name column to children table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'birth_date' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN birth_date date;
        RAISE NOTICE 'Added birth_date column to children table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'gender' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN gender text;
        RAISE NOTICE 'Added gender column to children table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'children' AND column_name = 'mobile_phone' AND table_schema = 'public') THEN
        ALTER TABLE children ADD COLUMN mobile_phone text;
        RAISE NOTICE 'Added mobile_phone column to children table';
    END IF;
END $$;

-- ============================================================================
-- REGISTRATIONS TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'child_id' AND table_schema = 'public') THEN
        ALTER TABLE registrations ADD COLUMN child_id text;
        RAISE NOTICE 'Added child_id column to registrations table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
        ALTER TABLE registrations ADD COLUMN cycle_id text;
        RAISE NOTICE 'Added cycle_id column to registrations table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'pre_registered_sunday_school' AND table_schema = 'public') THEN
        ALTER TABLE registrations ADD COLUMN pre_registered_sunday_school boolean;
        RAISE NOTICE 'Added pre_registered_sunday_school column to registrations table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'consents' AND table_schema = 'public') THEN
        ALTER TABLE registrations ADD COLUMN consents jsonb;
        RAISE NOTICE 'Added consents column to registrations table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'registrations' AND column_name = 'submitted_at' AND table_schema = 'public') THEN
        ALTER TABLE registrations ADD COLUMN submitted_at timestamptz;
        RAISE NOTICE 'Added submitted_at column to registrations table';
    END IF;
END $$;

-- ============================================================================
-- MINISTRY_ENROLLMENTS TABLE - Add missing cycle_id column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ministry_enrollments' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
        ALTER TABLE ministry_enrollments ADD COLUMN cycle_id text;
        RAISE NOTICE 'Added cycle_id column to ministry_enrollments table';
    END IF;
END $$;

-- ============================================================================
-- LEADER_ASSIGNMENTS TABLE - Add missing cycle_id column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leader_assignments' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
        ALTER TABLE leader_assignments ADD COLUMN cycle_id text;
        RAISE NOTICE 'Added cycle_id column to leader_assignments table';
    END IF;
END $$;

-- ============================================================================
-- CHILD_YEAR_PROFILES TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'child_year_profiles' AND column_name = 'cycle_id' AND table_schema = 'public') THEN
        ALTER TABLE child_year_profiles ADD COLUMN cycle_id text;
        RAISE NOTICE 'Added cycle_id column to child_year_profiles table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'child_year_profiles' AND column_name = 'notes' AND table_schema = 'public') THEN
        ALTER TABLE child_year_profiles ADD COLUMN notes text;
        RAISE NOTICE 'Added notes column to child_year_profiles table';
    END IF;
END $$;

-- ============================================================================
-- COMPETITION_YEARS TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_years' AND column_name = 'year' AND table_schema = 'public') THEN
        ALTER TABLE competition_years ADD COLUMN year integer;
        RAISE NOTICE 'Added year column to competition_years table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_years' AND column_name = 'description' AND table_schema = 'public') THEN
        ALTER TABLE competition_years ADD COLUMN description text;
        RAISE NOTICE 'Added description column to competition_years table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'competition_years' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE competition_years ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column to competition_years table';
    END IF;
END $$;

-- ============================================================================
-- SCRIPTURES TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scriptures' AND column_name = 'scripture_id' AND table_schema = 'public') THEN
        ALTER TABLE scriptures ADD COLUMN scripture_id text;
        RAISE NOTICE 'Added scripture_id column to scriptures table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scriptures' AND column_name = 'division_id' AND table_schema = 'public') THEN
        ALTER TABLE scriptures ADD COLUMN division_id text;
        RAISE NOTICE 'Added division_id column to scriptures table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scriptures' AND column_name = 'text' AND table_schema = 'public') THEN
        ALTER TABLE scriptures ADD COLUMN text text;
        RAISE NOTICE 'Added text column to scriptures table';
    END IF;
END $$;

-- ============================================================================
-- DIVISIONS TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'competition_year_id' AND table_schema = 'public') THEN
        ALTER TABLE divisions ADD COLUMN competition_year_id text;
        RAISE NOTICE 'Added competition_year_id column to divisions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'min_grade' AND table_schema = 'public') THEN
        ALTER TABLE divisions ADD COLUMN min_grade integer;
        RAISE NOTICE 'Added min_grade column to divisions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'max_grade' AND table_schema = 'public') THEN
        ALTER TABLE divisions ADD COLUMN max_grade integer;
        RAISE NOTICE 'Added max_grade column to divisions table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE divisions ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column to divisions table';
    END IF;
END $$;

-- ============================================================================
-- ESSAY_PROMPTS TABLE - Add missing columns
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'division_id' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN division_id text;
        RAISE NOTICE 'Added division_id column to essay_prompts table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'title' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN title text;
        RAISE NOTICE 'Added title column to essay_prompts table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'prompt' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN prompt text;
        RAISE NOTICE 'Added prompt column to essay_prompts table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'instructions' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN instructions text;
        RAISE NOTICE 'Added instructions column to essay_prompts table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'min_words' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN min_words integer;
        RAISE NOTICE 'Added min_words column to essay_prompts table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'max_words' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN max_words integer;
        RAISE NOTICE 'Added max_words column to essay_prompts table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'updated_at' AND table_schema = 'public') THEN
        ALTER TABLE essay_prompts ADD COLUMN updated_at timestamptz DEFAULT now();
        RAISE NOTICE 'Added updated_at column to essay_prompts table';
    END IF;
END $$;

-- ============================================================================
-- BRANDING_SETTINGS TABLE - Add missing organization_name column
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branding_settings' AND column_name = 'organization_name' AND table_schema = 'public') THEN
        ALTER TABLE branding_settings ADD COLUMN organization_name text;
        RAISE NOTICE 'Added organization_name column to branding_settings table';
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE 'All missing columns have been added successfully';
END $$;

COMMIT;
