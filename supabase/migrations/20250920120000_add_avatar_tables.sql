-- Migration: Add generic avatar storage table for all entity types
-- This migration creates a single polymorphic avatars table that can handle
-- children, guardians, leaders, users, and any future entity types

BEGIN;

-- Create generic avatars table with polymorphic design
CREATE TABLE IF NOT EXISTS avatars (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL, -- 'child', 'guardian', 'leader', 'user', etc.
  entity_id text NOT NULL,   -- The ID of the entity (child_id, guardian_id, etc.) - using text to match existing schema
  storage_path text NOT NULL,
  media_type text NOT NULL DEFAULT 'image/webp',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one avatar per entity
  UNIQUE(entity_type, entity_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_avatars_entity ON avatars(entity_type, entity_id);

-- Add row level security (but keep policies simple)
ALTER TABLE avatars ENABLE ROW LEVEL SECURITY;

-- Simple policy: authenticated users can read avatars
CREATE POLICY authenticated_users_read_avatars ON avatars
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Simple policy: authenticated users can insert avatars
CREATE POLICY authenticated_users_insert_avatars ON avatars
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Simple policy: authenticated users can update avatars
CREATE POLICY authenticated_users_update_avatars ON avatars
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Simple policy: authenticated users can delete avatars
CREATE POLICY authenticated_users_delete_avatars ON avatars
  FOR DELETE USING (auth.uid() IS NOT NULL);

COMMIT;