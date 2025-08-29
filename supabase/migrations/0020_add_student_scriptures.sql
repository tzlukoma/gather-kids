-- Migration: create student_scriptures to receive exported studentScriptures

CREATE TABLE IF NOT EXISTS student_scriptures (
  id text PRIMARY KEY,
  child_id text,
  competition_year_id text,
  scripture_id text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
);
