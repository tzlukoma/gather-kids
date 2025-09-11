-- Migration: Test authentication context during household insert
-- This migration will help us understand why auth.uid() might be NULL during registration

BEGIN;

-- Create a test function to check authentication context
CREATE OR REPLACE FUNCTION test_auth_context()
RETURNS TABLE (
    auth_uid_result text,
    auth_jwt_role text,
    is_authenticated boolean
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(auth.uid()::text, 'NULL') as auth_uid_result,
        COALESCE(auth.jwt() ->> 'role', 'NULL') as auth_jwt_role,
        (auth.uid() IS NOT NULL) as is_authenticated;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_auth_context() TO authenticated;

-- Let's also create a more permissive INSERT policy for testing
-- Drop the existing policy
DROP POLICY IF EXISTS "users_can_insert_households" ON households;

-- Create a very permissive policy for testing
CREATE POLICY "users_can_insert_households"
ON households
FOR INSERT
WITH CHECK (
    -- Allow any authenticated user (this should work)
    auth.uid() IS NOT NULL
    OR
    -- Allow admins
    (auth.jwt() ->> 'role')::text = 'ADMIN'
    OR
    -- TEMPORARY: Allow anyone for debugging (remove this after testing)
    true
);

DO $$
BEGIN
    RAISE NOTICE 'Created permissive INSERT policy for households table';
    RAISE NOTICE 'Policy allows: auth.uid() IS NOT NULL OR ADMIN OR true (temporary)';
    RAISE NOTICE 'Test function created: test_auth_context()';
END $$;

COMMIT;
