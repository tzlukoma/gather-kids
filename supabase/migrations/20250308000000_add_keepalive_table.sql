-- Migration: Add keepalive table for production free-tier database keepalive
-- Used by .github/workflows/supabase-keepalive.yml to prevent Supabase from auto-pausing.
-- Table is written to every 3 days; old rows are pruned by the workflow.

CREATE TABLE IF NOT EXISTS keepalive (
    id SERIAL PRIMARY KEY,
    pinged_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (workflow pings) and delete (cleanup old rows). Idempotent.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keepalive' AND policyname = 'keepalive_anon_insert') THEN
    CREATE POLICY "keepalive_anon_insert" ON keepalive FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'keepalive' AND policyname = 'keepalive_anon_delete') THEN
    CREATE POLICY "keepalive_anon_delete" ON keepalive FOR DELETE TO anon USING (true);
  END IF;
END $$;
