-- Migration: 0007_note_history
-- Description: Track note content changes for consolidation reversibility
-- Created: 2024-01-23

-- Track note content changes for consolidation reversibility
CREATE TABLE public.note_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES public.atomic_notes(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    changed_by TEXT NOT NULL, -- 'consolidation', 'user_edit', etc.
    source_id UUID, -- The source that triggered the consolidation
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX note_history_note_id_idx ON public.note_history(note_id);
CREATE INDEX note_history_created_at_idx ON public.note_history(created_at DESC);

-- RLS
ALTER TABLE public.note_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note history" ON public.note_history
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.atomic_notes
                WHERE atomic_notes.id = note_history.note_id
                AND atomic_notes.user_id = auth.uid())
    );

CREATE POLICY "Users can insert own note history" ON public.note_history
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.atomic_notes
                WHERE atomic_notes.id = note_history.note_id
                AND atomic_notes.user_id = auth.uid())
    );

-- Service role full access for Edge Functions
CREATE POLICY "Service role full access to note_history" ON public.note_history
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
