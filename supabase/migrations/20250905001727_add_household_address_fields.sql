-- Add missing address fields to households table for registration form compatibility
-- The frontend registration form expects address_line1, address_line2 instead of generic address

-- Add the missing address columns if they don't exist
ALTER TABLE households 
ADD COLUMN IF NOT EXISTS address_line1 text,
ADD COLUMN IF NOT EXISTS address_line2 text;

-- Migrate existing address data to address_line1 if address column exists and address_line1 is empty
UPDATE households 
SET address_line1 = address 
WHERE address IS NOT NULL 
  AND address != '' 
  AND (address_line1 IS NULL OR address_line1 = '');

-- Add comment for documentation
COMMENT ON COLUMN households.address_line1 IS 'Primary address line for household registration';
COMMENT ON COLUMN households.address_line2 IS 'Secondary address line (apartment, unit, etc.)';