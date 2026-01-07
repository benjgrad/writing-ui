-- Migration: 0002_goals_schema
-- Description: Goals and Micro-wins tables for Momentum Engine
-- Created: 2026-01-06

-- Goals table (The Active Trio + Parking Lot)
CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    why_root TEXT, -- Emotional motivation discovered through AI drilling
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'parked', 'completed', 'archived')),
    momentum INTEGER NOT NULL DEFAULT 3 CHECK (momentum >= 1 AND momentum <= 5), -- 1=Stuck, 5=Flowing
    position INTEGER NOT NULL DEFAULT 0, -- Order within status group
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX goals_user_id_idx ON public.goals(user_id);
CREATE INDEX goals_status_idx ON public.goals(status);
CREATE INDEX goals_user_status_idx ON public.goals(user_id, status);

-- Micro-wins table (Next steps for each goal)
CREATE TABLE public.micro_wins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    is_current BOOLEAN NOT NULL DEFAULT FALSE, -- Only show the NOW task
    completed_at TIMESTAMPTZ, -- NULL if not completed
    position INTEGER NOT NULL DEFAULT 0, -- Order within goal
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX micro_wins_goal_id_idx ON public.micro_wins(goal_id);
CREATE INDEX micro_wins_current_idx ON public.micro_wins(goal_id, is_current) WHERE is_current = TRUE;

-- Row Level Security
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.micro_wins ENABLE ROW LEVEL SECURITY;

-- Goals policies
CREATE POLICY "Users can view own goals" ON public.goals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals
    FOR DELETE USING (auth.uid() = user_id);

-- Micro-wins policies (access through goal ownership)
CREATE POLICY "Users can view own micro_wins" ON public.micro_wins
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.goals WHERE goals.id = micro_wins.goal_id AND goals.user_id = auth.uid())
    );
CREATE POLICY "Users can insert own micro_wins" ON public.micro_wins
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.goals WHERE goals.id = micro_wins.goal_id AND goals.user_id = auth.uid())
    );
CREATE POLICY "Users can update own micro_wins" ON public.micro_wins
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM public.goals WHERE goals.id = micro_wins.goal_id AND goals.user_id = auth.uid())
    );
CREATE POLICY "Users can delete own micro_wins" ON public.micro_wins
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.goals WHERE goals.id = micro_wins.goal_id AND goals.user_id = auth.uid())
    );

-- Trigger for updated_at on goals
CREATE TRIGGER update_goals_updated_at
    BEFORE UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to enforce Rule of Three (max 3 active goals)
CREATE OR REPLACE FUNCTION check_active_goals_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' THEN
        IF (SELECT COUNT(*) FROM public.goals
            WHERE user_id = NEW.user_id AND status = 'active' AND id != NEW.id) >= 3 THEN
            RAISE EXCEPTION 'Cannot have more than 3 active goals. Move a goal to the Parking Lot first.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_active_goals_limit
    BEFORE INSERT OR UPDATE ON public.goals
    FOR EACH ROW EXECUTE FUNCTION check_active_goals_limit();

-- Function to ensure only one current micro-win per goal
CREATE OR REPLACE FUNCTION ensure_single_current_micro_win()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_current = TRUE THEN
        UPDATE public.micro_wins
        SET is_current = FALSE
        WHERE goal_id = NEW.goal_id AND id != NEW.id AND is_current = TRUE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER single_current_micro_win
    BEFORE INSERT OR UPDATE ON public.micro_wins
    FOR EACH ROW EXECUTE FUNCTION ensure_single_current_micro_win();
