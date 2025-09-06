-- Migration: Fix branding_settings table schema to match application interface
-- 
-- The branding_settings table was created with different column names than what
-- the application TypeScript interface expects. This migration aligns the schema
-- with the BrandingSettings interface.

BEGIN;

-- Add missing columns expected by the BrandingSettings interface
ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS org_id text;

ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS app_name text;

ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS description text;

ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS use_logo_only boolean DEFAULT false;

ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS youtube_url text;

ALTER TABLE branding_settings 
ADD COLUMN IF NOT EXISTS instagram_url text;

-- Migrate data from organization_name to org_id if organization_name exists and org_id is null
UPDATE branding_settings 
SET org_id = COALESCE(organization_name, 'default')
WHERE org_id IS NULL;

-- Set default values for org_id for any remaining null values
UPDATE branding_settings 
SET org_id = 'default'
WHERE org_id IS NULL;

-- Make org_id non-nullable now that we have data
ALTER TABLE branding_settings 
ALTER COLUMN org_id SET NOT NULL;

-- Drop old columns that are no longer used by the application
-- We'll keep them for now to avoid data loss, but mark them as deprecated
-- ALTER TABLE branding_settings DROP COLUMN IF EXISTS organization_name;
-- ALTER TABLE branding_settings DROP COLUMN IF EXISTS primary_color;
-- ALTER TABLE branding_settings DROP COLUMN IF EXISTS secondary_color;
-- ALTER TABLE branding_settings DROP COLUMN IF EXISTS font_family;
-- ALTER TABLE branding_settings DROP COLUMN IF EXISTS custom_css;

COMMIT;