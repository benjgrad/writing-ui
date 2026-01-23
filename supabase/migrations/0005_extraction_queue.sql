-- Migration: 0005_extraction_queue
-- Description: Async extraction queue for knowledge graph
-- Created: 2026-01-21

-- Extraction queue table
CREATE TABLE public.extraction_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

    -- Source tracking (extensible for different content types)
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'coaching_session', 'manual_note')),
    source_id UUID NOT NULL,

    -- Content snapshot at time of queue (in case source changes before processing)
    content_snapshot TEXT NOT NULL,
    content_hash TEXT NOT NULL,

    -- Processing status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
    priority INTEGER NOT NULL DEFAULT 0, -- Higher = sooner processing

    -- Retry tracking
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,

    -- Results tracking
    notes_created INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Prevent duplicate processing of same content
    UNIQUE(user_id, source_type, source_id, content_hash)
);

-- Indexes for efficient queue processing
CREATE INDEX extraction_queue_pending_idx ON public.extraction_queue(status, priority DESC, created_at ASC)
    WHERE status = 'pending';
CREATE INDEX extraction_queue_user_status_idx ON public.extraction_queue(user_id, status);
CREATE INDEX extraction_queue_source_idx ON public.extraction_queue(source_type, source_id);

-- RLS Policies
ALTER TABLE public.extraction_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own extraction queue" ON public.extraction_queue
    FOR SELECT USING (auth.uid() = user_id);

-- Function to calculate content hash
CREATE OR REPLACE FUNCTION calculate_content_hash(content TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(sha256(content::bytea), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to queue document extraction
CREATE OR REPLACE FUNCTION queue_document_extraction()
RETURNS TRIGGER AS $$
DECLARE
    content_hash TEXT;
    min_word_count INTEGER := 50;
BEGIN
    -- Only queue if document has substantial content
    IF NEW.word_count < min_word_count THEN
        RETURN NEW;
    END IF;

    -- Calculate hash of content
    content_hash := calculate_content_hash(NEW.content);

    -- Insert into queue (ON CONFLICT handles deduplication)
    INSERT INTO public.extraction_queue (
        user_id,
        source_type,
        source_id,
        content_snapshot,
        content_hash,
        priority
    ) VALUES (
        NEW.user_id,
        'document',
        NEW.id,
        NEW.content,
        content_hash,
        0
    )
    ON CONFLICT (user_id, source_type, source_id, content_hash) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to queue coaching session extraction
CREATE OR REPLACE FUNCTION queue_coaching_extraction()
RETURNS TRIGGER AS $$
DECLARE
    session_content TEXT;
    session_user_id UUID;
    content_hash TEXT;
    message_count INTEGER;
BEGIN
    -- Get session info and aggregate all messages
    SELECT
        cs.user_id,
        string_agg(cm.role || ': ' || cm.content, E'\n\n' ORDER BY cm.created_at)
    INTO session_user_id, session_content
    FROM public.coaching_sessions cs
    LEFT JOIN public.coaching_messages cm ON cm.session_id = cs.id
    WHERE cs.id = NEW.session_id
    GROUP BY cs.user_id;

    -- Count messages
    SELECT COUNT(*) INTO message_count
    FROM public.coaching_messages
    WHERE session_id = NEW.session_id;

    -- Only queue if we have at least 4 messages (2 exchanges)
    IF message_count < 4 THEN
        RETURN NEW;
    END IF;

    -- Calculate hash of aggregated content
    content_hash := calculate_content_hash(session_content);

    -- Insert into queue
    INSERT INTO public.extraction_queue (
        user_id,
        source_type,
        source_id,
        content_snapshot,
        content_hash,
        priority
    ) VALUES (
        session_user_id,
        'coaching_session',
        NEW.session_id,
        session_content,
        content_hash,
        -1 -- Lower priority than documents
    )
    ON CONFLICT (user_id, source_type, source_id, content_hash) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers to queue content on save
CREATE TRIGGER queue_document_for_extraction
    AFTER INSERT OR UPDATE OF content ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION queue_document_extraction();

CREATE TRIGGER queue_coaching_for_extraction
    AFTER INSERT ON public.coaching_messages
    FOR EACH ROW
    EXECUTE FUNCTION queue_coaching_extraction();

-- Function to atomically claim a job from the queue
CREATE OR REPLACE FUNCTION claim_extraction_job(target_id UUID DEFAULT NULL)
RETURNS SETOF extraction_queue AS $$
DECLARE
    claimed_job extraction_queue;
BEGIN
    -- Try to claim specific job if ID provided
    IF target_id IS NOT NULL THEN
        UPDATE extraction_queue
        SET
            status = 'processing',
            started_at = NOW(),
            attempts = attempts + 1
        WHERE id = target_id
          AND status = 'pending'
        RETURNING * INTO claimed_job;

        IF FOUND THEN
            RETURN NEXT claimed_job;
            RETURN;
        END IF;
    END IF;

    -- Otherwise claim next available job
    UPDATE extraction_queue
    SET
        status = 'processing',
        started_at = NOW(),
        attempts = attempts + 1
    WHERE id = (
        SELECT id
        FROM extraction_queue
        WHERE status = 'pending'
        ORDER BY priority DESC, created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO claimed_job;

    IF FOUND THEN
        RETURN NEXT claimed_job;
    END IF;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for queue status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.extraction_queue;
