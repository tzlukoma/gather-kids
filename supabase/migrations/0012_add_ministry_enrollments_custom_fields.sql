-- Migration: add custom_fields column to ministry_enrollments to match import shape

ALTER TABLE IF EXISTS ministry_enrollments
  ADD COLUMN IF NOT EXISTS custom_fields jsonb;
