-- Migration: create events and attendance tables (minimal schema for import)

CREATE TABLE IF NOT EXISTS events (
  event_id text PRIMARY KEY,
  name text,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance (
  attendance_id text PRIMARY KEY,
  event_id text REFERENCES events(event_id) ON DELETE CASCADE,
  child_id text,
  date date,
  timeslot_id text,
  check_in_at timestamptz,
  checked_in_by text,
  created_at timestamptz DEFAULT now()
);
