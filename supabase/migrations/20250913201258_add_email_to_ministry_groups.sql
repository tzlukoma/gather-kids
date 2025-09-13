-- Add email field to ministry_groups table
-- This simplifies the data model by storing a single contact email directly on the group record
-- instead of using a separate ministry_group_contacts table

-- Add email column to ministry_groups
ALTER TABLE ministry_groups 
ADD COLUMN IF NOT EXISTS email text;

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS idx_ministry_groups_email ON ministry_groups(email) WHERE email IS NOT NULL;

-- Update the SQL functions to use the simplified email field
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
    JOIN ministry_groups mg ON LOWER(mg.email) = LOWER(ma.email) 
      AND mg.email IS NOT NULL
    JOIN ministry_group_members mgm ON mgm.group_id = mg.id
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
    JOIN ministry_groups mg ON LOWER(mg.email) = n.e 
      AND mg.email IS NOT NULL
    JOIN ministry_group_members mgm ON mgm.group_id = mg.id
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