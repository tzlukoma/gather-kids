-- Migration: Fix Row-Level Security policies for children table
-- This migration ensures authenticated users can insert/update children records
-- for households they are associated with through the user_households table
--
-- ROLE-BASED ACCESS CONTROL:
-- - GUARDIAN: Can only access data from households they're associated with via user_households table
-- - MINISTRY_LEADER: Can SELECT all data (needed for rosters, registrations dashboard)
-- - ADMIN: Can SELECT/INSERT/UPDATE/DELETE all data (full administrative access)
--
-- The role is stored in the JWT token as auth.jwt() ->> 'role'

BEGIN;

-- First, check if RLS is enabled on children table
DO $$
BEGIN
    -- Enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'children' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE children ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled Row Level Security on children table';
    ELSE
        RAISE NOTICE 'Row Level Security already enabled on children table';
    END IF;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "users_can_access_own_children" ON children;
DROP POLICY IF EXISTS "users_can_insert_children" ON children;
DROP POLICY IF EXISTS "users_can_update_children" ON children;

-- Policy: Users can SELECT children from households they are associated with
-- Also allows ADMIN and MINISTRY_LEADER roles to access all children
CREATE POLICY "users_can_access_own_children"
ON children
FOR SELECT
USING (
    -- Guardians can access children from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = children.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can access all children
    (auth.jwt() ->> 'role')::text = 'ADMIN'
    OR
    -- Ministry leaders can access all children (they need to see rosters/registrations)
    (auth.jwt() ->> 'role')::text = 'MINISTRY_LEADER'
);

-- Policy: Users can INSERT children into households they are associated with
-- Also allows ADMIN role to insert children anywhere
CREATE POLICY "users_can_insert_children"
ON children
FOR INSERT
WITH CHECK (
    -- Guardians can insert children into their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = children.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can insert children anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Policy: Users can UPDATE children from households they are associated with
-- Also allows ADMIN role to update any children
CREATE POLICY "users_can_update_children"
ON children
FOR UPDATE
USING (
    -- Guardians can update children from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = children.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any children
    (auth.jwt() ->> 'role')::text = 'ADMIN'
)
WITH CHECK (
    -- Guardians can update children in their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = children.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any children
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Policy: Users can DELETE children from households they are associated with
-- Also allows ADMIN role to delete any children
CREATE POLICY "users_can_delete_children"
ON children
FOR DELETE
USING (
    -- Guardians can delete children from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = children.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can delete any children
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Also ensure households table has proper RLS policies
DO $$
BEGIN
    -- Enable RLS on households if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'households' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE households ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled Row Level Security on households table';
    ELSE
        RAISE NOTICE 'Row Level Security already enabled on households table';
    END IF;
END $$;

-- Drop existing household policies if they exist
DROP POLICY IF EXISTS "users_can_access_own_households" ON households;
DROP POLICY IF EXISTS "users_can_insert_households" ON households;
DROP POLICY IF EXISTS "users_can_update_households" ON households;

-- Policy: Users can SELECT households they are associated with
-- Also allows ADMIN and MINISTRY_LEADER roles to access all households
CREATE POLICY "users_can_access_own_households"
ON households
FOR SELECT
USING (
    -- Guardians can access households they're associated with
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = households.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can access all households
    (auth.jwt() ->> 'role')::text = 'ADMIN'
    OR
    -- Ministry leaders can access all households (they need to see registrations)
    (auth.jwt() ->> 'role')::text = 'MINISTRY_LEADER'
);

-- Policy: Users can INSERT households (for new registrations)
-- Also allows ADMIN role to insert households
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

-- Policy: Users can UPDATE households they are associated with
-- Also allows ADMIN role to update any households
CREATE POLICY "users_can_update_households"
ON households
FOR UPDATE
USING (
    -- Guardians can update households they're associated with
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = households.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any households
    (auth.jwt() ->> 'role')::text = 'ADMIN'
)
WITH CHECK (
    -- Guardians can update households they're associated with
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = households.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any households
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Ensure guardians table has proper RLS policies
DO $$
BEGIN
    -- Enable RLS on guardians if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'guardians' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE guardians ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled Row Level Security on guardians table';
    ELSE
        RAISE NOTICE 'Row Level Security already enabled on guardians table';
    END IF;
END $$;

-- Drop existing guardian policies if they exist
DROP POLICY IF EXISTS "users_can_access_own_guardians" ON guardians;
DROP POLICY IF EXISTS "users_can_insert_guardians" ON guardians;
DROP POLICY IF EXISTS "users_can_update_guardians" ON guardians;

-- Policy: Users can SELECT guardians from households they are associated with
-- Also allows ADMIN and MINISTRY_LEADER roles to access all guardians
CREATE POLICY "users_can_access_own_guardians"
ON guardians
FOR SELECT
USING (
    -- Guardians can access guardians from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = guardians.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can access all guardians
    (auth.jwt() ->> 'role')::text = 'ADMIN'
    OR
    -- Ministry leaders can access all guardians (they need to see rosters)
    (auth.jwt() ->> 'role')::text = 'MINISTRY_LEADER'
);

-- Policy: Users can INSERT guardians into households they are associated with
-- Also allows ADMIN role to insert guardians anywhere
CREATE POLICY "users_can_insert_guardians"
ON guardians
FOR INSERT
WITH CHECK (
    -- Guardians can insert guardians into their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = guardians.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can insert guardians anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Policy: Users can UPDATE guardians from households they are associated with
-- Also allows ADMIN role to update any guardians
CREATE POLICY "users_can_update_guardians"
ON guardians
FOR UPDATE
USING (
    -- Guardians can update guardians from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = guardians.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any guardians
    (auth.jwt() ->> 'role')::text = 'ADMIN'
)
WITH CHECK (
    -- Guardians can update guardians in their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = guardians.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any guardians
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Ensure emergency_contacts table has proper RLS policies
DO $$
BEGIN
    -- Enable RLS on emergency_contacts if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'emergency_contacts' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled Row Level Security on emergency_contacts table';
    ELSE
        RAISE NOTICE 'Row Level Security already enabled on emergency_contacts table';
    END IF;
END $$;

-- Drop existing emergency_contacts policies if they exist
DROP POLICY IF EXISTS "users_can_access_own_emergency_contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "users_can_insert_emergency_contacts" ON emergency_contacts;
DROP POLICY IF EXISTS "users_can_update_emergency_contacts" ON emergency_contacts;

-- Policy: Users can SELECT emergency_contacts from households they are associated with
-- Also allows ADMIN and MINISTRY_LEADER roles to access all emergency_contacts
CREATE POLICY "users_can_access_own_emergency_contacts"
ON emergency_contacts
FOR SELECT
USING (
    -- Guardians can access emergency_contacts from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = emergency_contacts.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can access all emergency_contacts
    (auth.jwt() ->> 'role')::text = 'ADMIN'
    OR
    -- Ministry leaders can access all emergency_contacts (they need to see rosters)
    (auth.jwt() ->> 'role')::text = 'MINISTRY_LEADER'
);

-- Policy: Users can INSERT emergency_contacts into households they are associated with
-- Also allows ADMIN role to insert emergency_contacts anywhere
CREATE POLICY "users_can_insert_emergency_contacts"
ON emergency_contacts
FOR INSERT
WITH CHECK (
    -- Guardians can insert emergency_contacts into their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = emergency_contacts.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can insert emergency_contacts anywhere
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

-- Policy: Users can UPDATE emergency_contacts from households they are associated with
-- Also allows ADMIN role to update any emergency_contacts
CREATE POLICY "users_can_update_emergency_contacts"
ON emergency_contacts
FOR UPDATE
USING (
    -- Guardians can update emergency_contacts from their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = emergency_contacts.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any emergency_contacts
    (auth.jwt() ->> 'role')::text = 'ADMIN'
)
WITH CHECK (
    -- Guardians can update emergency_contacts in their households
    EXISTS (
        SELECT 1 FROM user_households 
        WHERE user_households.household_id::text = emergency_contacts.household_id::text
        AND user_households.auth_user_id = auth.uid()::text
    )
    OR
    -- Admins can update any emergency_contacts
    (auth.jwt() ->> 'role')::text = 'ADMIN'
);

COMMIT;
