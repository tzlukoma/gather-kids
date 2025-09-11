-- Migration: Fix divisions table foreign key constraints for Bible Bee cycles
-- This makes the old bible_bee_year_id nullable and updates constraints
-- Handles both old schema (bible_bee_year_id) and new schema (competitionYearId)

BEGIN;

-- Make bible_bee_year_id nullable in divisions table (old schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'divisions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'bible_bee_year_id') THEN
    -- Drop the existing foreign key constraint
    ALTER TABLE divisions DROP CONSTRAINT IF EXISTS divisions_bible_bee_year_id_fkey;
    
    -- Make the column nullable
    ALTER TABLE divisions ALTER COLUMN bible_bee_year_id DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable
    ALTER TABLE divisions ADD CONSTRAINT divisions_bible_bee_year_id_fkey 
      FOREIGN KEY (bible_bee_year_id) REFERENCES bible_bee_years(id);
    
    RAISE NOTICE 'Updated divisions table foreign key constraints (old schema)';
  END IF;
END $$;

-- Make competitionYearId nullable in divisions table (new schema)
DO $$
DECLARE
  competition_years_id_type TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'divisions') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'divisions' AND column_name = 'competitionYearId') THEN
    
    -- Check the actual type of competition_years.id column
    SELECT data_type INTO competition_years_id_type
    FROM information_schema.columns
    WHERE table_name = 'competition_years' AND column_name = 'id' AND table_schema = 'public';
    
    -- Drop the existing foreign key constraint
    ALTER TABLE divisions DROP CONSTRAINT IF EXISTS divisions_competitionYearId_fkey;
    
    -- Make the column nullable
    ALTER TABLE divisions ALTER COLUMN "competitionYearId" DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable (only if types match)
    IF competition_years_id_type IS NOT NULL THEN
      ALTER TABLE divisions ADD CONSTRAINT divisions_competitionYearId_fkey 
        FOREIGN KEY ("competitionYearId") REFERENCES competition_years(id);
      RAISE NOTICE 'Updated divisions table foreign key constraints (new schema) - competition_years.id is %', competition_years_id_type;
    ELSE
      RAISE NOTICE 'Skipped divisions foreign key constraint - competition_years.id type unknown';
    END IF;
  END IF;
END $$;

-- Make bible_bee_year_id nullable in essay_prompts table (old schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompts') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'bible_bee_year_id') THEN
    -- Drop the existing foreign key constraint
    ALTER TABLE essay_prompts DROP CONSTRAINT IF EXISTS essay_prompts_bible_bee_year_id_fkey;
    
    -- Make the column nullable
    ALTER TABLE essay_prompts ALTER COLUMN bible_bee_year_id DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable
    ALTER TABLE essay_prompts ADD CONSTRAINT essay_prompts_bible_bee_year_id_fkey 
      FOREIGN KEY (bible_bee_year_id) REFERENCES bible_bee_years(id);
    
    RAISE NOTICE 'Updated essay_prompts table foreign key constraints (old schema)';
  END IF;
END $$;

-- Make competitionYearId nullable in essay_prompts table (new schema)
DO $$
DECLARE
  competition_years_id_type TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'essay_prompts') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'essay_prompts' AND column_name = 'competitionYearId') THEN
    
    -- Check the actual type of competition_years.id column
    SELECT data_type INTO competition_years_id_type
    FROM information_schema.columns
    WHERE table_name = 'competition_years' AND column_name = 'id' AND table_schema = 'public';
    
    -- Drop the existing foreign key constraint
    ALTER TABLE essay_prompts DROP CONSTRAINT IF EXISTS essay_prompts_competitionYearId_fkey;
    
    -- Make the column nullable
    ALTER TABLE essay_prompts ALTER COLUMN "competitionYearId" DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable (only if types match)
    IF competition_years_id_type IS NOT NULL THEN
      ALTER TABLE essay_prompts ADD CONSTRAINT essay_prompts_competitionYearId_fkey 
        FOREIGN KEY ("competitionYearId") REFERENCES competition_years(id);
      RAISE NOTICE 'Updated essay_prompts table foreign key constraints (new schema) - competition_years.id is %', competition_years_id_type;
    ELSE
      RAISE NOTICE 'Skipped essay_prompts foreign key constraint - competition_years.id type unknown';
    END IF;
  END IF;
END $$;

-- Make bible_bee_year_id nullable in enrollment_overrides table (old schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollment_overrides') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollment_overrides' AND column_name = 'bible_bee_year_id') THEN
    -- Drop the existing foreign key constraint
    ALTER TABLE enrollment_overrides DROP CONSTRAINT IF EXISTS enrollment_overrides_bible_bee_year_id_fkey;
    
    -- Make the column nullable
    ALTER TABLE enrollment_overrides ALTER COLUMN bible_bee_year_id DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable
    ALTER TABLE enrollment_overrides ADD CONSTRAINT enrollment_overrides_bible_bee_year_id_fkey 
      FOREIGN KEY (bible_bee_year_id) REFERENCES bible_bee_years(id);
    
    RAISE NOTICE 'Updated enrollment_overrides table foreign key constraints (old schema)';
  END IF;
END $$;

-- Make competitionYearId nullable in enrollment_overrides table (new schema)
DO $$
DECLARE
  competition_years_id_type TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollment_overrides') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'enrollment_overrides' AND column_name = 'competitionYearId') THEN
    
    -- Check the actual type of competition_years.id column
    SELECT data_type INTO competition_years_id_type
    FROM information_schema.columns
    WHERE table_name = 'competition_years' AND column_name = 'id' AND table_schema = 'public';
    
    -- Drop the existing foreign key constraint
    ALTER TABLE enrollment_overrides DROP CONSTRAINT IF EXISTS enrollment_overrides_competitionYearId_fkey;
    
    -- Make the column nullable
    ALTER TABLE enrollment_overrides ALTER COLUMN "competitionYearId" DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable (only if types match)
    IF competition_years_id_type IS NOT NULL THEN
      ALTER TABLE enrollment_overrides ADD CONSTRAINT enrollment_overrides_competitionYearId_fkey 
        FOREIGN KEY ("competitionYearId") REFERENCES competition_years(id);
      RAISE NOTICE 'Updated enrollment_overrides table foreign key constraints (new schema) - competition_years.id is %', competition_years_id_type;
    ELSE
      RAISE NOTICE 'Skipped enrollment_overrides foreign key constraint - competition_years.id type unknown';
    END IF;
  END IF;
END $$;

-- Make bible_bee_year_id nullable in scriptures table (old schema)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scriptures') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scriptures' AND column_name = 'bible_bee_year_id') THEN
    -- Drop the existing foreign key constraint
    ALTER TABLE scriptures DROP CONSTRAINT IF EXISTS scriptures_bible_bee_year_id_fkey;
    
    -- Make the column nullable
    ALTER TABLE scriptures ALTER COLUMN bible_bee_year_id DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable
    ALTER TABLE scriptures ADD CONSTRAINT scriptures_bible_bee_year_id_fkey 
      FOREIGN KEY (bible_bee_year_id) REFERENCES bible_bee_years(id);
    
    RAISE NOTICE 'Updated scriptures table foreign key constraints (old schema)';
  END IF;
END $$;

-- Make competition_year_id nullable in scriptures table (new schema)
DO $$
DECLARE
  competition_years_id_type TEXT;
  scriptures_competition_year_id_type TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scriptures') AND
     EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'scriptures' AND column_name = 'competition_year_id') THEN
    
    -- Check the actual type of competition_years.id column
    SELECT data_type INTO competition_years_id_type
    FROM information_schema.columns
    WHERE table_name = 'competition_years' AND column_name = 'id' AND table_schema = 'public';
    
    -- Check the actual type of scriptures.competition_year_id column
    SELECT data_type INTO scriptures_competition_year_id_type
    FROM information_schema.columns
    WHERE table_name = 'scriptures' AND column_name = 'competition_year_id' AND table_schema = 'public';
    
    -- Drop the existing foreign key constraint
    ALTER TABLE scriptures DROP CONSTRAINT IF EXISTS scriptures_competition_year_id_fkey;
    
    -- Make the column nullable
    ALTER TABLE scriptures ALTER COLUMN competition_year_id DROP NOT NULL;
    
    -- Add back the foreign key constraint but now nullable (only if types match)
    IF competition_years_id_type IS NOT NULL AND scriptures_competition_year_id_type IS NOT NULL THEN
      IF competition_years_id_type = scriptures_competition_year_id_type THEN
        ALTER TABLE scriptures ADD CONSTRAINT scriptures_competition_year_id_fkey 
          FOREIGN KEY (competition_year_id) REFERENCES competition_years(id);
        RAISE NOTICE 'Updated scriptures table foreign key constraints (new schema) - both columns are %', competition_years_id_type;
      ELSE
        RAISE NOTICE 'Skipped scriptures foreign key constraint - type mismatch: competition_years.id is % but scriptures.competition_year_id is %', competition_years_id_type, scriptures_competition_year_id_type;
      END IF;
    ELSE
      RAISE NOTICE 'Skipped scriptures foreign key constraint - could not determine column types';
    END IF;
  END IF;
END $$;

COMMIT;
