-- Migration: create student_essays to receive exported studentEssays

CREATE TABLE IF NOT EXISTS student_essays (
  id text PRIMARY KEY,
  child_id text,
  competition_year_id text,
  status text,
  prompt_text text,
  instructions text,
  created_at timestamptz,
  updated_at timestamptz
);
