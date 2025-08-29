-- Migration: add columns expected by the Dexie export

-- households
ALTER TABLE IF EXISTS households
  ADD COLUMN IF NOT EXISTS preferred_scripture_translation text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- guardians
ALTER TABLE IF EXISTS guardians
  ADD COLUMN IF NOT EXISTS relationship text,
  ADD COLUMN IF NOT EXISTS is_primary boolean,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;

-- children
ALTER TABLE IF EXISTS children
  ADD COLUMN IF NOT EXISTS grade text,
  ADD COLUMN IF NOT EXISTS is_active boolean,
  ADD COLUMN IF NOT EXISTS special_needs boolean,
  ADD COLUMN IF NOT EXISTS mobile_phone text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
