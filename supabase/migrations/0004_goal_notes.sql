-- Migration: 0004_goal_notes
-- Description: Add notes field to goals for medium-long term planning
-- Created: 2026-01-07

-- Add notes column to goals table
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.goals.notes IS 'Medium-long term plans and notes for the goal';
