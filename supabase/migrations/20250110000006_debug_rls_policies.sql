-- Migration: Debug RLS policies for households table
-- This migration will help us understand why the households INSERT policy is failing

BEGIN;

-- First, let's check what policies currently exist on the households table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== CURRENT POLICIES ON HOUSEHOLDS TABLE ===';
    
    FOR policy_record IN 
        SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual,
            with_check
        FROM pg_policies 
        WHERE tablename = 'households'
        ORDER BY policyname
    LOOP
        RAISE NOTICE 'Policy: % | Command: % | Roles: % | Qual: % | With Check: %', 
            policy_record.policyname,
            policy_record.cmd,
            policy_record.roles,
            policy_record.qual,
            policy_record.with_check;
    END LOOP;
    
    -- Check if RLS is enabled
    IF EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'households' 
        AND relrowsecurity = true
    ) THEN
        RAISE NOTICE 'RLS is ENABLED on households table';
    ELSE
        RAISE NOTICE 'RLS is DISABLED on households table';
    END IF;
END $$;

-- Now let's ensure we have the correct INSERT policy
-- Drop any existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "users_can_insert_households" ON households;

-- Create the correct INSERT policy for households
-- This should allow any authenticated user to insert households during registration
CREATE POLICY "users_can_insert_households"
ON households
FOR INSERT
WITH CHECK (
    -- All authenticated users can create households (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert households
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

RAISE NOTICE 'Households INSERT policy created: Allows auth.uid() IS NOT NULL';

-- Let's also verify the policy was created correctly
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'households' 
    AND cmd = 'INSERT';
    
    RAISE NOTICE 'Total INSERT policies on households: %', policy_count;
    
    IF policy_count = 0 THEN
        RAISE NOTICE 'ERROR: No INSERT policies found on households table!';
    ELSE
        RAISE NOTICE 'SUCCESS: INSERT policy exists on households table';
    END IF;
END $$;

COMMIT;
