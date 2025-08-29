-- Migration: add timeslots jsonb column to events
ALTER TABLE IF EXISTS events
  ADD COLUMN IF NOT EXISTS timeslots jsonb;
