-- Drop the ministry_group_contacts table as it's no longer needed
-- Contact email is now stored directly on the ministry_groups table

-- Drop related triggers first
DROP TRIGGER IF EXISTS update_ministry_group_contacts_updated_at ON ministry_group_contacts;

-- Drop indexes
DROP INDEX IF EXISTS idx_ministry_group_contacts_group_id;
DROP INDEX IF EXISTS idx_ministry_group_contacts_email;

-- Drop the table
DROP TABLE IF EXISTS ministry_group_contacts;