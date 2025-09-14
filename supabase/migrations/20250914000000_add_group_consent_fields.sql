-- Add consent management fields to ministry_groups table
-- This allows groups to define custom consent text and requirements

-- Add consent fields to ministry_groups table
ALTER TABLE ministry_groups 
ADD COLUMN IF NOT EXISTS custom_consent_text text,
ADD COLUMN IF NOT EXISTS custom_consent_required boolean DEFAULT false;

-- Add comment to explain the purpose
COMMENT ON COLUMN ministry_groups.custom_consent_text IS 'Custom consent text that will be displayed for this group during registration';
COMMENT ON COLUMN ministry_groups.custom_consent_required IS 'Whether consent is required for ministries in this group';

-- Update the existing choirs group with the choir consent text
UPDATE ministry_groups 
SET 
  custom_consent_text = 'Cathedral International youth choirs communicate using the Planning Center app. By clicking yes, you agree to be added into the app, which will enable you to download the app, receive emails and push communications.',
  custom_consent_required = true
WHERE code = 'choirs';
