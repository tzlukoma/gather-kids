-- Add Bible Bee Divisions table
CREATE TABLE IF NOT EXISTS public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    minimum_required INTEGER NOT NULL DEFAULT 0,
    min_last_order INTEGER, -- calculated minimum boundary
    min_grade INTEGER NOT NULL, -- 0-12
    max_grade INTEGER NOT NULL, -- 0-12
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE("competitionYearId", name)
);

-- Add Essay Prompts table
CREATE TABLE IF NOT EXISTS public.essay_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
    division_name TEXT, -- optional, can be per division or general
    prompt_text TEXT NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Add Grade Rules table if it doesn't exist
-- Note: We're checking since this may already exist in some environments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'grade_rules') THEN
        CREATE TABLE public.grade_rules (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
            "minGrade" INTEGER NOT NULL, -- 0-12
            "maxGrade" INTEGER NOT NULL, -- 0-12
            type TEXT NOT NULL CHECK (type IN ('scripture', 'essay')),
            "targetCount" INTEGER,
            "promptText" TEXT,
            instructions TEXT,
            "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
            "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
        );
    END IF;
END
$$;

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
CREATE TABLE IF NOT EXISTS public.bible_bee_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
    "childId" TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
    "divisionId" UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    auto_enrolled BOOLEAN NOT NULL DEFAULT TRUE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE("competitionYearId", "childId")
);

-- Add enrollment overrides table
CREATE TABLE IF NOT EXISTS public.enrollment_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "competitionYearId" TEXT NOT NULL REFERENCES public.competition_years(id) ON DELETE CASCADE,
    "childId" TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
    "divisionId" UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE("competitionYearId", "childId")
);
