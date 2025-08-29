-- Migration: add external_id to scriptures to preserve client ids during import

ALTER TABLE IF EXISTS scriptures
  ADD COLUMN IF NOT EXISTS external_id text;
