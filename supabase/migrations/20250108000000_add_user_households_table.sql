-- Migration: Add user_households table for linking authenticated users to households
-- This table is required by the canonical DAL for proper user-household relationships

CREATE TABLE IF NOT EXISTS user_households (
    user_household_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id text NOT NULL, -- Supabase auth user ID
    household_id text NOT NULL REFERENCES households(household_id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    
    -- Ensure one household per user (for now)
    UNIQUE(auth_user_id)
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_households_auth_user_id ON user_households(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_households_household_id ON user_households(household_id);

-- Add comment explaining the table's purpose
COMMENT ON TABLE user_households IS 'Links authenticated Supabase users to their household records for route protection and data access';
COMMENT ON COLUMN user_households.auth_user_id IS 'Supabase auth user ID from auth.users table';
COMMENT ON COLUMN user_households.household_id IS 'Reference to the household record';
