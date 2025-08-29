CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS scriptures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_year_id uuid NOT NULL,
  "order" integer NOT NULL,
  reference text NOT NULL,
  texts jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);