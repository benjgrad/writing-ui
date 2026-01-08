-- Migration: 0003_coaching_sessions
-- Description: Store goal coaching chat history for review and continuation
-- Created: 2026-01-08

-- Coaching sessions table (stores conversation history per goal)
CREATE TABLE public.coaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal_id UUID REFERENCES public.goals(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    stage TEXT NOT NULL DEFAULT 'welcome' CHECK (stage IN ('welcome', 'goal_discovery', 'why_drilling', 'micro_win', 'confirmation', 'complete')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE, -- Can continue this session
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: goal_id can be NULL during initial coaching before goal is created
-- Once goal is created, we link the session to it

CREATE INDEX coaching_sessions_user_id_idx ON public.coaching_sessions(user_id);
CREATE INDEX coaching_sessions_goal_id_idx ON public.coaching_sessions(goal_id);
CREATE INDEX coaching_sessions_active_idx ON public.coaching_sessions(user_id, is_active) WHERE is_active = TRUE;

-- Coaching messages table (individual chat messages)
CREATE TABLE public.coaching_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.coaching_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX coaching_messages_session_id_idx ON public.coaching_messages(session_id);
CREATE INDEX coaching_messages_session_order_idx ON public.coaching_messages(session_id, created_at);

-- Row Level Security
ALTER TABLE public.coaching_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;

-- Coaching sessions policies
CREATE POLICY "Users can view own coaching sessions" ON public.coaching_sessions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own coaching sessions" ON public.coaching_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own coaching sessions" ON public.coaching_sessions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own coaching sessions" ON public.coaching_sessions
    FOR DELETE USING (auth.uid() = user_id);

-- Coaching messages policies (access through session ownership)
CREATE POLICY "Users can view own coaching messages" ON public.coaching_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.coaching_sessions WHERE coaching_sessions.id = coaching_messages.session_id AND coaching_sessions.user_id = auth.uid())
    );
CREATE POLICY "Users can insert own coaching messages" ON public.coaching_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.coaching_sessions WHERE coaching_sessions.id = coaching_messages.session_id AND coaching_sessions.user_id = auth.uid())
    );

-- Trigger for updated_at on coaching_sessions
CREATE TRIGGER update_coaching_sessions_updated_at
    BEFORE UPDATE ON public.coaching_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
