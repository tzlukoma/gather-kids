-- Migration: Comprehensive RLS debugging for authentication context
-- This will help us understand why auth.uid() is returning NULL during registration

BEGIN;

-- Create a test function to check authentication context during inserts
CREATE OR REPLACE FUNCTION debug_auth_context()
RETURNS TABLE (
    auth_uid_result text,
    auth_jwt_role text,
    auth_jwt_full text,
    is_authenticated boolean,
    current_user_name text,
    session_user_name text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(auth.uid()::text, 'NULL') as auth_uid_result,
        COALESCE(auth.jwt() ->> 'role', 'NULL') as auth_jwt_role,
        COALESCE(auth.jwt()::text, 'NULL') as auth_jwt_full,
        (auth.uid() IS NOT NULL) as is_authenticated,
        COALESCE(current_user, 'NULL') as current_user_name,
        COALESCE(session_user, 'NULL') as session_user_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION debug_auth_context() TO authenticated;

-- Create a trigger function to log authentication context on household inserts
CREATE OR REPLACE FUNCTION log_household_insert_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    auth_info RECORD;
BEGIN
    -- Get authentication context
    SELECT * INTO auth_info FROM debug_auth_context();
    
    -- Log the authentication context
    RAISE NOTICE 'HOUSEHOLD INSERT AUTH DEBUG:';
    RAISE NOTICE '  auth.uid(): %', auth_info.auth_uid_result;
    RAISE NOTICE '  auth.jwt() role: %', auth_info.auth_jwt_role;
    RAISE NOTICE '  is_authenticated: %', auth_info.is_authenticated;
    RAISE NOTICE '  current_user: %', auth_info.current_user_name;
    RAISE NOTICE '  session_user: %', auth_info.session_user_name;
    RAISE NOTICE '  household_id: %', NEW.household_id;
    
    RETURN NEW;
END;
$$;

-- Create trigger on households table
DROP TRIGGER IF EXISTS household_insert_auth_debug ON households;
CREATE TRIGGER household_insert_auth_debug
    BEFORE INSERT ON households
    FOR EACH ROW
    EXECUTE FUNCTION log_household_insert_auth();

-- Temporarily disable RLS on households again for testing
ALTER TABLE households DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'Created comprehensive RLS debugging tools';
    RAISE NOTICE 'Function: debug_auth_context() - call this to check auth state';
    RAISE NOTICE 'Trigger: household_insert_auth_debug - logs auth context on inserts';
    RAISE NOTICE 'RLS disabled on households for testing';
    RAISE NOTICE '';
    RAISE NOTICE 'To test auth context manually, run:';
    RAISE NOTICE 'SELECT * FROM debug_auth_context();';
END $$;

COMMIT;
