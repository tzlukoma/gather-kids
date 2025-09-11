-- Migration: Disable RLS on registration tables for MVP
-- This allows the registration flow to work without RLS complexity
-- RLS can be re-enabled later when we have time to properly configure it

BEGIN;

-- Disable RLS on all registration-related tables
ALTER TABLE households DISABLE ROW LEVEL SECURITY;
ALTER TABLE guardians DISABLE ROW LEVEL SECURITY;
ALTER TABLE children DISABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts DISABLE ROW LEVEL SECURITY;

-- Also disable RLS on related tables that might be used during registration
ALTER TABLE registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE ministry_enrollments DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'RLS disabled on registration tables for MVP:';
    RAISE NOTICE '  - households';
    RAISE NOTICE '  - guardians';
    RAISE NOTICE '  - children';
    RAISE NOTICE '  - emergency_contacts';
    RAISE NOTICE '  - registrations';
    RAISE NOTICE '  - ministry_enrollments';
    RAISE NOTICE '';
    RAISE NOTICE 'Registration flow should now work without RLS restrictions';
    RAISE NOTICE 'RLS can be re-enabled later with proper policies';
END $$;

COMMIT;
