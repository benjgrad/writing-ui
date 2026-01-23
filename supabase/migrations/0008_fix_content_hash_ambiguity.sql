-- Migration: 0008_fix_content_hash_ambiguity
-- Description: Fix ambiguous column reference in extraction queue triggers
-- Created: 2026-01-23

-- Drop existing triggers first
DROP TRIGGER IF EXISTS queue_document_for_extraction ON public.documents;
DROP TRIGGER IF EXISTS queue_coaching_for_extraction ON public.coaching_messages;

-- Fix the document extraction function - rename variable to avoid ambiguity
CREATE OR REPLACE FUNCTION queue_document_extraction()
RETURNS TRIGGER AS $$
DECLARE
    v_content_hash TEXT;
    min_word_count INTEGER := 50;
BEGIN
    -- Only queue if document has substantial content
    IF NEW.word_count < min_word_count THEN
        RETURN NEW;
    END IF;

    -- Calculate hash of content
    v_content_hash := calculate_content_hash(NEW.content);

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
        v_content_hash,
        0
    )
    ON CONFLICT (user_id, source_type, source_id, content_hash) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix the coaching extraction function - rename variable to avoid ambiguity
CREATE OR REPLACE FUNCTION queue_coaching_extraction()
RETURNS TRIGGER AS $$
DECLARE
    session_content TEXT;
    session_user_id UUID;
    v_content_hash TEXT;
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
    v_content_hash := calculate_content_hash(session_content);

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
        v_content_hash,
        -1 -- Lower priority than documents
    )
    ON CONFLICT (user_id, source_type, source_id, content_hash) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate triggers
CREATE TRIGGER queue_document_for_extraction
    AFTER INSERT OR UPDATE OF content ON public.documents
    FOR EACH ROW
    EXECUTE FUNCTION queue_document_extraction();

CREATE TRIGGER queue_coaching_for_extraction
    AFTER INSERT ON public.coaching_messages
    FOR EACH ROW
    EXECUTE FUNCTION queue_coaching_extraction();
