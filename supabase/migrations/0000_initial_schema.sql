-- Migration: 0000_initial_schema
-- Description: Initial database schema for writing app
-- Created: 2024-12-27

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Profiles table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    learning_goals TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Documents table (writing sessions)
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT NOT NULL DEFAULT '',
    content_with_timestamps JSONB NOT NULL DEFAULT '[]',
    word_count INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    last_prompt_shown TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX documents_content_search_idx ON public.documents
    USING GIN (to_tsvector('english', title || ' ' || content));
CREATE INDEX documents_user_id_idx ON public.documents(user_id);
CREATE INDEX documents_updated_at_idx ON public.documents(updated_at DESC);

-- Atomic notes (zettelkasten cards)
CREATE TABLE public.atomic_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    note_type TEXT NOT NULL DEFAULT 'permanent',
    ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
    user_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX atomic_notes_user_id_idx ON public.atomic_notes(user_id);
CREATE INDEX atomic_notes_source_document_idx ON public.atomic_notes(source_document_id);
CREATE INDEX atomic_notes_type_idx ON public.atomic_notes(note_type);

-- Tags for atomic notes
CREATE TABLE public.tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, name)
);

CREATE INDEX tags_user_id_idx ON public.tags(user_id);

-- Junction table: Notes to Tags
CREATE TABLE public.note_tags (
    note_id UUID NOT NULL REFERENCES public.atomic_notes(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    PRIMARY KEY (note_id, tag_id)
);

-- Connections between atomic notes (graph edges)
CREATE TABLE public.note_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    source_note_id UUID NOT NULL REFERENCES public.atomic_notes(id) ON DELETE CASCADE,
    target_note_id UUID NOT NULL REFERENCES public.atomic_notes(id) ON DELETE CASCADE,
    connection_type TEXT NOT NULL DEFAULT 'related',
    strength REAL NOT NULL DEFAULT 0.5,
    ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(source_note_id, target_note_id)
);

CREATE INDEX note_connections_source_idx ON public.note_connections(source_note_id);
CREATE INDEX note_connections_target_idx ON public.note_connections(target_note_id);
CREATE INDEX note_connections_user_id_idx ON public.note_connections(user_id);

-- Note attributes (key-value pairs for additional metadata)
CREATE TABLE public.note_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID NOT NULL REFERENCES public.atomic_notes(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(note_id, key)
);

CREATE INDEX note_attributes_note_id_idx ON public.note_attributes(note_id);

-- AI prompts history
CREATE TABLE public.prompt_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    context_text TEXT NOT NULL,
    prompt_generated TEXT NOT NULL,
    was_helpful BOOLEAN,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atomic_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.note_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Documents policies
CREATE POLICY "Users can view own documents" ON public.documents
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON public.documents
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.documents
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON public.documents
    FOR DELETE USING (auth.uid() = user_id);

-- Atomic notes policies
CREATE POLICY "Users can view own notes" ON public.atomic_notes
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.atomic_notes
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.atomic_notes
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.atomic_notes
    FOR DELETE USING (auth.uid() = user_id);

-- Tags policies
CREATE POLICY "Users can view own tags" ON public.tags
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own tags" ON public.tags
    FOR ALL USING (auth.uid() = user_id);

-- Note tags policies
CREATE POLICY "Users can view own note_tags" ON public.note_tags
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_tags.note_id AND atomic_notes.user_id = auth.uid())
    );
CREATE POLICY "Users can manage own note_tags" ON public.note_tags
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_tags.note_id AND atomic_notes.user_id = auth.uid())
    );

-- Note connections policies
CREATE POLICY "Users can view own connections" ON public.note_connections
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own connections" ON public.note_connections
    FOR ALL USING (auth.uid() = user_id);

-- Note attributes policies
CREATE POLICY "Users can view own attributes" ON public.note_attributes
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_attributes.note_id AND atomic_notes.user_id = auth.uid())
    );
CREATE POLICY "Users can manage own attributes" ON public.note_attributes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.atomic_notes WHERE atomic_notes.id = note_attributes.note_id AND atomic_notes.user_id = auth.uid())
    );

-- Prompt history policies
CREATE POLICY "Users can view own prompt history" ON public.prompt_history
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own prompt history" ON public.prompt_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_atomic_notes_updated_at
    BEFORE UPDATE ON public.atomic_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
