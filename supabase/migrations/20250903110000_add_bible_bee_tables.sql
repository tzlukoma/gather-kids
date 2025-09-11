-- Ensure children table exists with correct schema before creating dependent tables
-- First create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS children (
  child_id text PRIMARY KEY,
  external_id text,
  household_id text,
  external_household_id text,
  first_name text,
  last_name text,
  birth_date date,
  dob date,
  grade text,
  gender text,
  mobile_phone text,
  child_mobile text,
  allergies text,
  notes text,
  medical_notes text,
  special_needs boolean DEFAULT false,
  special_needs_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Now ensure the child_id column exists and is the primary key
DO $$
BEGIN
    -- Check if child_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'children' 
        AND column_name = 'child_id' 
        AND table_schema = 'public'
    ) THEN
        -- Add child_id column if it doesn't exist
        ALTER TABLE children ADD COLUMN child_id text;
        
        -- If there's an existing primary key, drop it
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'children' 
            AND constraint_type = 'PRIMARY KEY'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE children DROP CONSTRAINT children_pkey;
        END IF;
        
        -- Set child_id as primary key
        ALTER TABLE children ADD PRIMARY KEY (child_id);
        
        RAISE NOTICE 'Added child_id column and set as primary key for children table';
    ELSE
        RAISE NOTICE 'child_id column already exists in children table';
    END IF;
END $$;

-- Ensure divisions table exists with correct schema
-- First create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  minimum_required INTEGER NOT NULL DEFAULT 0,
  min_last_order INTEGER,
  min_grade INTEGER NOT NULL,
  max_grade INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Now ensure the id column exists and is the primary key
DO $$
DECLARE
    competition_years_id_type TEXT;
BEGIN
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'divisions' 
        AND column_name = 'id' 
        AND table_schema = 'public'
    ) THEN
        -- Add id column if it doesn't exist
        ALTER TABLE divisions ADD COLUMN id UUID DEFAULT gen_random_uuid();
        
        -- If there's an existing primary key, drop it
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'divisions' 
            AND constraint_type = 'PRIMARY KEY'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE divisions DROP CONSTRAINT divisions_pkey;
        END IF;
        
        -- Set id as primary key
        ALTER TABLE divisions ADD PRIMARY KEY (id);
        
        RAISE NOTICE 'Added id column and set as primary key for divisions table';
    ELSE
        RAISE NOTICE 'id column already exists in divisions table';
    END IF;
    
    -- Now add competitionYearId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'divisions' 
        AND column_name = 'competitionYearId' 
        AND table_schema = 'public'
    ) THEN
        -- Check the actual type of competition_years.id column
        SELECT data_type INTO competition_years_id_type
        FROM information_schema.columns 
        WHERE table_name = 'competition_years' 
        AND column_name = 'id' 
        AND table_schema = 'public';
        
        -- Add competitionYearId column with appropriate type
        IF competition_years_id_type = 'uuid' THEN
            ALTER TABLE divisions ADD COLUMN "competitionYearId" UUID;
            RAISE NOTICE 'Added competitionYearId UUID column to divisions table';
        ELSE
            ALTER TABLE divisions ADD COLUMN "competitionYearId" TEXT;
            RAISE NOTICE 'Added competitionYearId TEXT column to divisions table';
        END IF;
        
        -- Add foreign key constraint
        ALTER TABLE divisions ADD CONSTRAINT divisions_competitionYearId_fkey 
            FOREIGN KEY ("competitionYearId") REFERENCES competition_years(id) ON DELETE CASCADE;
            
        -- Add unique constraint
        ALTER TABLE divisions ADD CONSTRAINT divisions_competitionYearId_name_unique 
            UNIQUE("competitionYearId", name);
    ELSE
        RAISE NOTICE 'competitionYearId column already exists in divisions table';
    END IF;
END $$;

-- Ensure essay_prompts table exists with correct schema
-- First create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS essay_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_name TEXT,
  prompt_text TEXT NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Now ensure the id column exists and add competitionYearId if needed
DO $$
DECLARE
    competition_years_id_type TEXT;
BEGIN
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' 
        AND column_name = 'id' 
        AND table_schema = 'public'
    ) THEN
        -- Add id column if it doesn't exist
        ALTER TABLE essay_prompts ADD COLUMN id UUID DEFAULT gen_random_uuid();
        
        -- If there's an existing primary key, drop it
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'essay_prompts' 
            AND constraint_type = 'PRIMARY KEY'
            AND table_schema = 'public'
        ) THEN
            ALTER TABLE essay_prompts DROP CONSTRAINT essay_prompts_pkey;
        END IF;
        
        -- Set id as primary key
        ALTER TABLE essay_prompts ADD PRIMARY KEY (id);
        
        RAISE NOTICE 'Added id column and set as primary key for essay_prompts table';
    ELSE
        RAISE NOTICE 'id column already exists in essay_prompts table';
    END IF;
    
    -- Now add competitionYearId column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'essay_prompts' 
        AND column_name = 'competitionYearId' 
        AND table_schema = 'public'
    ) THEN
        -- Check the actual type of competition_years.id column
        SELECT data_type INTO competition_years_id_type
        FROM information_schema.columns 
        WHERE table_name = 'competition_years' 
        AND column_name = 'id' 
        AND table_schema = 'public';
        
        -- Add competitionYearId column with appropriate type
        IF competition_years_id_type = 'uuid' THEN
            ALTER TABLE essay_prompts ADD COLUMN "competitionYearId" UUID;
            RAISE NOTICE 'Added competitionYearId UUID column to essay_prompts table';
        ELSE
            ALTER TABLE essay_prompts ADD COLUMN "competitionYearId" TEXT;
            RAISE NOTICE 'Added competitionYearId TEXT column to essay_prompts table';
        END IF;
        
        -- Add foreign key constraint
        ALTER TABLE essay_prompts ADD CONSTRAINT essay_prompts_competitionYearId_fkey 
            FOREIGN KEY ("competitionYearId") REFERENCES competition_years(id) ON DELETE CASCADE;
    ELSE
        RAISE NOTICE 'competitionYearId column already exists in essay_prompts table';
    END IF;
END $$;

-- Add Grade Rules table if it doesn't exist
-- Note: We're checking since this may already exist in some environments
-- Handle both TEXT and UUID types for competition_years.id
DO $$
DECLARE
    competition_years_id_type TEXT;
BEGIN
    -- Only proceed if the grade_rules table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grade_rules') THEN
        
        -- Check the actual type of competition_years.id column
        SELECT data_type INTO competition_years_id_type
        FROM information_schema.columns 
        WHERE table_name = 'competition_years' 
        AND column_name = 'id' 
        AND table_schema = 'public';
        
        -- Create the table with the appropriate type for competitionYearId
        IF competition_years_id_type = 'uuid' THEN
            EXECUTE '
            CREATE TABLE public.grade_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "competitionYearId" UUID NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
                "minGrade" INTEGER NOT NULL,
                "maxGrade" INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN (''scripture'', ''essay'')),
                "targetCount" INTEGER,
                "promptText" TEXT,
                instructions TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
            )';
            RAISE NOTICE 'Created grade_rules table with UUID competitionYearId';
        ELSE
            EXECUTE '
            CREATE TABLE public.grade_rules (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
                "minGrade" INTEGER NOT NULL,
                "maxGrade" INTEGER NOT NULL,
                type TEXT NOT NULL CHECK (type IN (''scripture'', ''essay'')),
                "targetCount" INTEGER,
                "promptText" TEXT,
                instructions TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
            )';
            RAISE NOTICE 'Created grade_rules table with TEXT competitionYearId';
        END IF;
    END IF;
END $$;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for each table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_divisions_updated_at') THEN
        CREATE TRIGGER update_divisions_updated_at
        BEFORE UPDATE ON divisions
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_essay_prompts_updated_at') THEN
        CREATE TRIGGER update_essay_prompts_updated_at
        BEFORE UPDATE ON essay_prompts
        FOR EACH ROW
        EXECUTE FUNCTION update_modified_column();
    END IF;
END
$$;

-- Add Bible Bee enrollments table
-- Handle both TEXT and UUID types for competition_years.id
-- children table is now guaranteed to exist with child_id text
DO $$
DECLARE
    competition_years_id_type TEXT;
BEGIN
    -- Check the actual type of competition_years.id column
    SELECT data_type INTO competition_years_id_type
    FROM information_schema.columns 
    WHERE table_name = 'competition_years' 
    AND column_name = 'id' 
    AND table_schema = 'public';
    
    -- Create the table with the appropriate type for competitionYearId
    IF competition_years_id_type = 'uuid' THEN
        EXECUTE '
        CREATE TABLE IF NOT EXISTS public.bible_bee_enrollments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "competitionYearId" UUID NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
            "childId" TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
            "divisionId" UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
            auto_enrolled BOOLEAN NOT NULL DEFAULT TRUE,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            UNIQUE("competitionYearId", "childId")
        )';
        RAISE NOTICE 'Created bible_bee_enrollments table with UUID competitionYearId';
    ELSE
        EXECUTE '
        CREATE TABLE IF NOT EXISTS public.bible_bee_enrollments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
            "childId" TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
            "divisionId" UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
            auto_enrolled BOOLEAN NOT NULL DEFAULT TRUE,
            enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            UNIQUE("competitionYearId", "childId")
        )';
        RAISE NOTICE 'Created bible_bee_enrollments table with TEXT competitionYearId';
    END IF;
END $$;

-- Add enrollment overrides table
-- Handle both TEXT and UUID types for competition_years.id
-- children table is now guaranteed to exist with child_id text
DO $$
DECLARE
    competition_years_id_type TEXT;
BEGIN
    -- Check the actual type of competition_years.id column
    SELECT data_type INTO competition_years_id_type
    FROM information_schema.columns 
    WHERE table_name = 'competition_years' 
    AND column_name = 'id' 
    AND table_schema = 'public';
    
    -- Create the table with the appropriate type for competitionYearId
    IF competition_years_id_type = 'uuid' THEN
        EXECUTE '
        CREATE TABLE IF NOT EXISTS public.enrollment_overrides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "competitionYearId" UUID NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
            "childId" TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
            "divisionId" UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
            reason TEXT,
            created_by TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            UNIQUE("competitionYearId", "childId")
        )';
        RAISE NOTICE 'Created enrollment_overrides table with UUID competitionYearId';
    ELSE
        EXECUTE '
        CREATE TABLE IF NOT EXISTS public.enrollment_overrides (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
            "childId" TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
            "divisionId" UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
            reason TEXT,
            created_by TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            UNIQUE("competitionYearId", "childId")
        )';
        RAISE NOTICE 'Created enrollment_overrides table with TEXT competitionYearId';
    END IF;
END $$;
