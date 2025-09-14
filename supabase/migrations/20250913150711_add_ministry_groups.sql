-- Add ministry groups and group-level email RBAC
-- This migration implements the Ministry Groups feature with group-level email access

-- Enable citext extension for case-insensitive emails
CREATE EXTENSION IF NOT EXISTS citext;

-- Create ministry_groups table
CREATE TABLE IF NOT EXISTS ministry_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,     -- e.g., 'choirs'
  name text NOT NULL,            -- e.g., 'Choirs'
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create ministry_group_members table (many-to-many)
CREATE TABLE IF NOT EXISTS ministry_group_members (
  group_id uuid NOT NULL REFERENCES ministry_groups(id) ON DELETE CASCADE,
  ministry_id text NOT NULL REFERENCES ministries(ministry_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, ministry_id)
);

-- Create ministry_group_contacts table for group-level email RBAC
CREATE TABLE IF NOT EXISTS ministry_group_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES ministry_groups(id) ON DELETE CASCADE,
  email citext NOT NULL,                       -- case-insensitive email
  display_name text,
  role text NOT NULL DEFAULT 'ADMIN',          -- 'ADMIN' | 'VIEWER' (future)
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, email)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ministry_group_members_group_id ON ministry_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_ministry_group_members_ministry_id ON ministry_group_members(ministry_id);
CREATE INDEX IF NOT EXISTS idx_ministry_group_contacts_group_id ON ministry_group_contacts(group_id);
CREATE INDEX IF NOT EXISTS idx_ministry_group_contacts_email ON ministry_group_contacts(email);

-- Function: Get ministry IDs accessible to a ministry account
CREATE OR REPLACE FUNCTION fn_ministry_ids_ministry_account_can_access(p_account_id uuid)
RETURNS TABLE(ministry_id text)
LANGUAGE sql STABLE AS $$
  WITH direct_ministries AS (
    SELECT ma.ministry_id 
    FROM ministry_accounts ma
    WHERE ma.id = p_account_id 
      AND ma.is_active = true 
      AND ma.ministry_id IS NOT NULL
  ),
  via_groups AS (
    -- Access via group membership through account email
    SELECT mgm.ministry_id
    FROM ministry_accounts ma
    JOIN ministry_group_contacts mgc ON LOWER(mgc.email) = LOWER(ma.email) 
      AND mgc.is_active = true
    JOIN ministry_group_members mgm ON mgm.group_id = mgc.group_id
    WHERE ma.id = p_account_id 
      AND ma.is_active = true
  )
  SELECT ministry_id FROM direct_ministries
  UNION
  SELECT ministry_id FROM via_groups;
$$;

-- Function: Get ministry IDs accessible to a raw email
CREATE OR REPLACE FUNCTION fn_ministry_ids_email_can_access(p_email text)
RETURNS TABLE(ministry_id text)
LANGUAGE sql STABLE AS $$
  WITH normalized AS (
    SELECT LOWER(TRIM(p_email)) AS e
  ),
  via_groups AS (
    SELECT mgm.ministry_id
    FROM normalized n
    JOIN ministry_group_contacts mgc ON LOWER(mgc.email) = n.e 
      AND mgc.is_active = true
    JOIN ministry_group_members mgm ON mgm.group_id = mgc.group_id
  ),
  via_direct_accounts AS (
    SELECT ma.ministry_id
    FROM normalized n
    JOIN ministry_accounts ma ON LOWER(ma.email) = n.e 
      AND ma.is_active = true 
      AND ma.ministry_id IS NOT NULL
  )
  SELECT ministry_id FROM via_groups
  UNION
  SELECT ministry_id FROM via_direct_accounts;
$$;

-- Add updated_at triggers for new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    DROP TRIGGER IF EXISTS update_ministry_groups_updated_at ON ministry_groups;
    CREATE TRIGGER update_ministry_groups_updated_at
        BEFORE UPDATE ON ministry_groups
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        
    DROP TRIGGER IF EXISTS update_ministry_group_contacts_updated_at ON ministry_group_contacts;
    CREATE TRIGGER update_ministry_group_contacts_updated_at
        BEFORE UPDATE ON ministry_group_contacts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
END $$;