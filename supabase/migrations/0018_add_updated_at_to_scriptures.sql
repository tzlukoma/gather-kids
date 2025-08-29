-- Migration: add updated_at column to scriptures table

ALTER TABLE IF EXISTS scriptures
  ADD COLUMN IF NOT EXISTS updated_at timestamptz;
