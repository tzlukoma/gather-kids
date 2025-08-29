-- Migration: create grade_rules to receive exported gradeRules

CREATE TABLE IF NOT EXISTS grade_rules (
  id text PRIMARY KEY,
  competition_year_id text,
  min_grade integer,
  max_grade integer,
  type text,
  target_count integer,
  prompt_text text,
  instructions text,
  created_at timestamptz,
  updated_at timestamptz
);
