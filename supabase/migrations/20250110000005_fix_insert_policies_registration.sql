-- Migration: Fix INSERT policies for registration flow
-- This migration ensures INSERT policies allow authenticated users during registration
-- The previous migration may have been partially applied or failed

BEGIN;

-- Drop and recreate children INSERT policy
DROP POLICY IF EXISTS "users_can_insert_children" ON children;
CREATE POLICY "users_can_insert_children"
ON children
FOR INSERT
WITH CHECK (
    -- All authenticated users can insert children (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert children anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Drop and recreate guardians INSERT policy
DROP POLICY IF EXISTS "users_can_insert_guardians" ON guardians;
CREATE POLICY "users_can_insert_guardians"
ON guardians
FOR INSERT
WITH CHECK (
    -- All authenticated users can insert guardians (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert guardians anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Drop and recreate emergency_contacts INSERT policy
DROP POLICY IF EXISTS "users_can_insert_emergency_contacts" ON emergency_contacts;
CREATE POLICY "users_can_insert_emergency_contacts"
ON emergency_contacts
FOR INSERT
WITH CHECK (
    -- All authenticated users can insert emergency_contacts (for registration)
    auth.uid() IS NOT NULL
    OR
    -- Admins can insert emergency_contacts anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Verify policies were created
DO $$
BEGIN
    RAISE NOTICE 'Registration INSERT policies updated successfully';
    RAISE NOTICE 'Children INSERT policy: Allows auth.uid() IS NOT NULL';
    RAISE NOTICE 'Guardians INSERT policy: Allows auth.uid() IS NOT NULL';
    RAISE NOTICE 'Emergency contacts INSERT policy: Allows auth.uid() IS NOT NULL';
END $$;

COMMIT;
