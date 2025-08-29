-- Migration: create incidents table to match Dexie export

CREATE TABLE IF NOT EXISTS incidents (
  incident_id text PRIMARY KEY,
  child_id text,
  child_name text,
  event_id text,
  description text,
  severity text,
  leader_id text,
  timestamp timestamptz,
  admin_acknowledged_at timestamptz,
  created_at timestamptz DEFAULT now()
);
