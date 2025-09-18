-- Migration: Fresh Bible Bee Schema with Canonical DTOs
-- This migration drops existing Bible Bee tables and recreates them with the correct canonical schema
-- Since there's no live data, this is safe to do

BEGIN;

-- ============================================================================
-- 1. DROP EXISTING BIBLE BEE TABLES (in dependency order)
-- ============================================================================

-- Drop tables that reference other Bible Bee tables first
DROP TABLE IF EXISTS public.student_scriptures CASCADE;
DROP TABLE IF EXISTS public.student_essays CASCADE;
DROP TABLE IF EXISTS public.bible_bee_enrollments CASCADE;
DROP TABLE IF EXISTS public.enrollment_overrides CASCADE;
DROP TABLE IF EXISTS public.essay_prompts CASCADE;
DROP TABLE IF EXISTS public.divisions CASCADE;

-- Drop core Bible Bee tables
DROP TABLE IF EXISTS public.bible_bee_cycles CASCADE;
DROP TABLE IF EXISTS public.bible_bee_years CASCADE;

-- ============================================================================
-- 2. CREATE FRESH BIBLE BEE TABLES WITH CANONICAL SCHEMA
-- ============================================================================

-- Create bible_bee_cycles table (canonical)
CREATE TABLE public.bible_bee_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id TEXT NOT NULL REFERENCES public.registration_cycles(cycle_id),
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create divisions table (canonical)
CREATE TABLE public.divisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bible_bee_cycle_id UUID NOT NULL REFERENCES public.bible_bee_cycles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    minimum_required INTEGER NOT NULL DEFAULT 0,
    min_last_order INTEGER,
    min_grade INTEGER NOT NULL CHECK (min_grade >= 0 AND min_grade <= 12),
    max_grade INTEGER NOT NULL CHECK (max_grade >= 0 AND max_grade <= 12),
    requires_essay BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    CONSTRAINT chk_divisions_grade_range CHECK (min_grade <= max_grade),
    CONSTRAINT chk_divisions_minimum_required CHECK (minimum_required >= 0)
);

-- Create bible_bee_enrollments table (canonical)
CREATE TABLE public.bible_bee_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bible_bee_cycle_id UUID NOT NULL REFERENCES public.bible_bee_cycles(id) ON DELETE CASCADE,
    child_id TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    auto_enrolled BOOLEAN DEFAULT true,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(bible_bee_cycle_id, child_id)
);

-- Create enrollment_overrides table (canonical)
CREATE TABLE public.enrollment_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bible_bee_cycle_id UUID NOT NULL REFERENCES public.bible_bee_cycles(id) ON DELETE CASCADE,
    child_id TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(bible_bee_cycle_id, child_id)
);

-- Create essay_prompts table (canonical)
CREATE TABLE public.essay_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bible_bee_cycle_id UUID NOT NULL REFERENCES public.bible_bee_cycles(id) ON DELETE CASCADE,
    division_id UUID REFERENCES public.divisions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    instructions TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_scriptures table (canonical)
CREATE TABLE public.student_scriptures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bible_bee_cycle_id UUID NOT NULL REFERENCES public.bible_bee_cycles(id) ON DELETE CASCADE,
    child_id TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
    scripture_id UUID NOT NULL REFERENCES public.scriptures(id) ON DELETE CASCADE,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(bible_bee_cycle_id, child_id, scripture_id)
);

-- Create student_essays table (canonical)
CREATE TABLE public.student_essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id TEXT NOT NULL REFERENCES public.children(child_id) ON DELETE CASCADE,
    bible_bee_cycle_id UUID NOT NULL REFERENCES public.bible_bee_cycles(id) ON DELETE CASCADE,
    essay_prompt_id UUID NOT NULL REFERENCES public.essay_prompts(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(child_id, essay_prompt_id)
);

-- ============================================================================
-- 3. UPDATE EXISTING SCRIPTURES TABLE
-- ============================================================================

-- Add bible_bee_cycle_id to scriptures table if it doesn't exist
ALTER TABLE public.scriptures 
ADD COLUMN IF NOT EXISTS bible_bee_cycle_id UUID REFERENCES public.bible_bee_cycles(id);

-- Add missing columns to scriptures table
ALTER TABLE public.scriptures 
ADD COLUMN IF NOT EXISTS scripture_number TEXT;

ALTER TABLE public.scriptures 
ADD COLUMN IF NOT EXISTS scripture_order INTEGER;

ALTER TABLE public.scriptures 
ADD COLUMN IF NOT EXISTS counts_for INTEGER DEFAULT 1;

ALTER TABLE public.scriptures 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE public.scriptures 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Indexes for bible_bee_cycles
CREATE INDEX idx_bible_bee_cycles_cycle_id ON public.bible_bee_cycles(cycle_id);
CREATE INDEX idx_bible_bee_cycles_active ON public.bible_bee_cycles(is_active);

-- Indexes for divisions
CREATE INDEX idx_divisions_bible_bee_cycle_id ON public.divisions(bible_bee_cycle_id);
CREATE INDEX idx_divisions_minimum_required ON public.divisions(minimum_required);
CREATE INDEX idx_divisions_grade_range ON public.divisions(min_grade, max_grade);

-- Indexes for bible_bee_enrollments
CREATE INDEX idx_bible_bee_enrollments_cycle_id ON public.bible_bee_enrollments(bible_bee_cycle_id);
CREATE INDEX idx_bible_bee_enrollments_child_id ON public.bible_bee_enrollments(child_id);
CREATE INDEX idx_bible_bee_enrollments_division_id ON public.bible_bee_enrollments(division_id);

-- Indexes for enrollment_overrides
CREATE INDEX idx_enrollment_overrides_cycle_id ON public.enrollment_overrides(bible_bee_cycle_id);
CREATE INDEX idx_enrollment_overrides_child_id ON public.enrollment_overrides(child_id);
CREATE INDEX idx_enrollment_overrides_division_id ON public.enrollment_overrides(division_id);

-- Indexes for essay_prompts
CREATE INDEX idx_essay_prompts_cycle_id ON public.essay_prompts(bible_bee_cycle_id);
CREATE INDEX idx_essay_prompts_division_id ON public.essay_prompts(division_id);

-- Indexes for student_scriptures
CREATE INDEX idx_student_scriptures_cycle_id ON public.student_scriptures(bible_bee_cycle_id);
CREATE INDEX idx_student_scriptures_child_id ON public.student_scriptures(child_id);
CREATE INDEX idx_student_scriptures_scripture_id ON public.student_scriptures(scripture_id);
CREATE INDEX idx_student_scriptures_completed ON public.student_scriptures(is_completed);

-- Indexes for student_essays
CREATE INDEX idx_student_essays_child_id ON public.student_essays(child_id);
CREATE INDEX idx_student_essays_bible_bee_cycle_id ON public.student_essays(bible_bee_cycle_id);
CREATE INDEX idx_student_essays_essay_prompt_id ON public.student_essays(essay_prompt_id);
CREATE INDEX idx_student_essays_status ON public.student_essays(status);

-- Indexes for scriptures
CREATE INDEX idx_scriptures_bible_bee_cycle_id ON public.scriptures(bible_bee_cycle_id);
CREATE INDEX idx_scriptures_scripture_order ON public.scriptures(scripture_order);

-- ============================================================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.bible_bee_cycles IS 'Bible Bee competition cycles linked to registration cycles';
COMMENT ON TABLE public.divisions IS 'Bible Bee divisions (age/grade groups) within cycles';
COMMENT ON TABLE public.bible_bee_enrollments IS 'Child enrollments in Bible Bee cycles';
COMMENT ON TABLE public.enrollment_overrides IS 'Manual division placement overrides for children';
COMMENT ON TABLE public.essay_prompts IS 'Essay requirements for divisions';
COMMENT ON TABLE public.student_scriptures IS 'Individual child progress on specific scriptures';
COMMENT ON TABLE public.student_essays IS 'Individual child essay submissions and progress';

COMMENT ON COLUMN public.divisions.minimum_required IS 'Minimum number of scriptures required for this division';
COMMENT ON COLUMN public.divisions.min_last_order IS 'Calculated minimum boundary for progress tracking';
COMMENT ON COLUMN public.divisions.requires_essay IS 'Whether this division requires an essay submission';
COMMENT ON COLUMN public.scriptures.texts IS 'JSONB object with translation keys (NIV, KJV, NVI) mapping to scripture text';
COMMENT ON COLUMN public.scriptures.counts_for IS 'How many scriptures this entry counts as (default: 1)';

COMMIT;
