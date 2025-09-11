-- Migration: Fix all registration table INSERT policies with proper logic
-- This migration fixes the root cause instead of using temporary workarounds

BEGIN;

-- The issue: INSERT policies require user_households relationship to exist
-- But user_households is created AFTER the household/guardians/children records
-- Solution: Allow authenticated users to insert during registration flow

-- Fix households INSERT policy
DROP POLICY IF EXISTS "users_can_insert_households" ON households;
CREATE POLICY "users_can_insert_households"
ON households
FOR INSERT
WITH CHECK (
    -- Allow any authenticated user to create households (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert households
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Fix guardians INSERT policy  
DROP POLICY IF EXISTS "users_can_insert_guardians" ON guardians;
CREATE POLICY "users_can_insert_guardians"
ON guardians
FOR INSERT
WITH CHECK (
    -- Allow any authenticated user to insert guardians (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert guardians anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Fix children INSERT policy
DROP POLICY IF EXISTS "users_can_insert_children" ON children;
CREATE POLICY "users_can_insert_children"
ON children
FOR INSERT
WITH CHECK (
    -- Allow any authenticated user to insert children (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert children anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Fix emergency_contacts INSERT policy
DROP POLICY IF EXISTS "users_can_insert_emergency_contacts" ON emergency_contacts;
CREATE POLICY "users_can_insert_emergency_contacts"
ON emergency_contacts
FOR INSERT
WITH CHECK (
    -- Allow any authenticated user to insert emergency contacts (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert emergency contacts anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Re-enable RLS on households (we disabled it earlier)
ALTER TABLE households ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    RAISE NOTICE 'Fixed all registration table INSERT policies';
    RAISE NOTICE 'Policy logic: Allow auth.uid() IS NOT NULL for registration flow';
    RAISE NOTICE 'Re-enabled RLS on households table';
    RAISE NOTICE 'All policies now allow authenticated users to insert during registration';
END $$;

COMMIT;
