-- Migration: create emergency_contacts table

CREATE TABLE IF NOT EXISTS emergency_contacts (
  contact_id text PRIMARY KEY,
  -- store the client household id as text (external id); mapping to server UUIDs
  -- will be maintained by the import tooling when needed
  household_id text,
  first_name text,
  last_name text,
  mobile_phone text,
  relationship text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
