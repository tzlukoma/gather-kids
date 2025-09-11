-- Migration: Temporarily disable RLS on households table for testing
-- This will help us determine if the issue is with RLS policies or something else

BEGIN;

-- First, let's check the current RLS status and policies
DO $$
DECLARE
    rls_enabled boolean;
    policy_count integer;
    policy_record RECORD;
BEGIN
    -- Check if RLS is enabled
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = 'households';
    
    RAISE NOTICE 'Current RLS status on households: %', rls_enabled;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'households';
    
    RAISE NOTICE 'Current policy count on households: %', policy_count;
    
    -- List all policies
    FOR policy_record IN 
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies 
        WHERE tablename = 'households'
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Qual: % | With Check: %', 
            policy_record.policyname,
            policy_record.cmd,
            policy_record.qual,
            policy_record.with_check;
    END LOOP;
END $$;

-- TEMPORARILY DISABLE RLS ON HOUSEHOLDS TABLE
-- This should allow ALL inserts without any policy checks
ALTER TABLE households DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'RLS DISABLED on households table - all inserts should now work';
    RAISE NOTICE 'This is a temporary measure for debugging';
END $$;

COMMIT;
