-- Migration: 0006_note_sources
-- Description: Add many-to-many relationship between atomic notes and their source content
-- Created: 2024-01-23

-- Junction table linking atomic notes to their sources (documents or coaching sessions)
CREATE TABLE public.note_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES public.atomic_notes(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'coaching_session')),
    source_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(note_id, source_type, source_id)
);

CREATE INDEX note_sources_note_id_idx ON public.note_sources(note_id);
CREATE INDEX note_sources_source_idx ON public.note_sources(source_type, source_id);

-- RLS policies
ALTER TABLE public.note_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own note_sources" ON public.note_sources
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_sources.note_id AND atomic_notes.user_id = auth.uid())
    );

CREATE POLICY "Users can insert own note_sources" ON public.note_sources
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_sources.note_id AND atomic_notes.user_id = auth.uid())
    );

CREATE POLICY "Users can delete own note_sources" ON public.note_sources
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_sources.note_id AND atomic_notes.user_id = auth.uid())
    );

-- Service role full access for Edge Functions
CREATE POLICY "Service role full access to note_sources" ON public.note_sources
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
