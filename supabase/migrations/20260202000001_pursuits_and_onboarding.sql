-- Migration: 20260202000001_pursuits_and_onboarding
-- Description: Add Aristotelian domain scores and completeness tracking to goals,
--              create onboarding_selections table, update status constraint
-- Created: 2026-02-02

-- Add domain scores (Aristotelian life domains) to goals table
-- Each pursuit scores across all 7 domains: sophia, phronesis, arete, koinonia, soma, techne, theoria
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS domain_scores JSONB NOT NULL DEFAULT '{"sophia":0,"phronesis":0,"arete":0,"koinonia":0,"soma":0,"techne":0,"theoria":0}'::jsonb;

-- Add completeness tracking (what aspects of the pursuit have been filled in)
ALTER TABLE public.goals
  ADD COLUMN IF NOT EXISTS completeness JSONB NOT NULL DEFAULT '{"title":true,"why":false,"steps":false,"notes":false}'::jsonb;

-- Update the status CHECK constraint to include 'fulfilled' (for pursuits that are ongoing but achieved)
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_status_check;
-- The original constraint was inline in CREATE TABLE, need to handle both cases
DO $$
BEGIN
  -- Try to drop the inline check constraint (Supabase names these differently)
  ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_status_check;
EXCEPTION WHEN undefined_object THEN
  -- Ignore if it doesn't exist
  NULL;
END $$;

-- Re-add with the new status values
ALTER TABLE public.goals
  ADD CONSTRAINT goals_status_check
  CHECK (status IN ('active', 'parked', 'completed', 'fulfilled', 'archived'));

-- Onboarding selections table
-- Stores what users picked during onboarding (both predefined and custom items)
CREATE TABLE IF NOT EXISTS public.onboarding_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    domain_scores JSONB NOT NULL DEFAULT '{"sophia":0,"phronesis":0,"arete":0,"koinonia":0,"soma":0,"techne":0,"theoria":0}'::jsonb,
    is_predefined BOOLEAN NOT NULL DEFAULT TRUE,
    pursuit_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS onboarding_selections_user_idx ON public.onboarding_selections(user_id);

-- Row Level Security for onboarding_selections
ALTER TABLE public.onboarding_selections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding selections" ON public.onboarding_selections
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own onboarding selections" ON public.onboarding_selections
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own onboarding selections" ON public.onboarding_selections
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own onboarding selections" ON public.onboarding_selections
    FOR DELETE USING (auth.uid() = user_id);
