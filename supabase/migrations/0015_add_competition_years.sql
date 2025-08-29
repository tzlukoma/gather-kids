-- Migration: create competition_years for competitionYears export

CREATE TABLE IF NOT EXISTS competition_years (
  id text PRIMARY KEY,
  year integer,
  name text,
  description text,
  created_at timestamptz,
  updated_at timestamptz
);
