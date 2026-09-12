-- Migration: Add competition dates to Bible Bee cycles
-- Allows admin to control when household scripture text becomes available

BEGIN;

-- Add competition_start_date column (nullable date)
ALTER TABLE public.bible_bee_cycles
ADD COLUMN IF NOT EXISTS competition_start_date DATE NULL;

-- Add competition_end_date column (nullable date)
ALTER TABLE public.bible_bee_cycles
ADD COLUMN IF NOT EXISTS competition_end_date DATE NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.bible_bee_cycles.competition_start_date IS 'Date when household/parent views can see scripture text. NULL means text is immediately available.';
COMMENT ON COLUMN public.bible_bee_cycles.competition_end_date IS 'Optional end date for the competition cycle.';

COMMIT;
