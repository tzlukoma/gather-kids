-- Migration: Add daily digest checkpoints table
-- This table tracks the last run timestamp for the daily digest to prevent duplicate sends

CREATE TABLE IF NOT EXISTS daily_digest_checkpoints (
    id SERIAL PRIMARY KEY,
    checkpoint_name TEXT UNIQUE NOT NULL,
    last_run_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_daily_digest_checkpoints_name 
ON daily_digest_checkpoints(checkpoint_name);

-- Insert initial checkpoint if none exists (24 hours ago)
INSERT INTO daily_digest_checkpoints (checkpoint_name, last_run_at)
VALUES ('daily_digest', NOW() - INTERVAL '24 hours')
ON CONFLICT (checkpoint_name) DO NOTHING;