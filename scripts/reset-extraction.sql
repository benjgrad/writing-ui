-- Reset and Regenerate Atomic Note Extraction
-- Run this in Supabase SQL Editor

-- Step 1: Clear existing data (order matters due to foreign keys)

-- Clear note attributes
DELETE FROM public.note_attributes;

-- Clear note tags junction table
DELETE FROM public.note_tags;

-- Clear note connections (graph edges)
DELETE FROM public.note_connections;

-- Clear atomic notes
DELETE FROM public.atomic_notes;

-- Clear tags
DELETE FROM public.tags;

-- Clear extraction queue
DELETE FROM public.extraction_queue;

-- Clear note sources (if exists)
DELETE FROM public.note_sources;

-- Step 2: Re-queue all documents with sufficient content for extraction
INSERT INTO public.extraction_queue (
    user_id,
    source_type,
    source_id,
    content_snapshot,
    content_hash,
    priority
)
SELECT
    user_id,
    'document',
    id,
    content,
    calculate_content_hash(content),
    0
FROM public.documents
WHERE word_count >= 50
  AND is_archived = FALSE
ON CONFLICT (user_id, source_type, source_id, content_hash) DO NOTHING;

-- Step 3: Re-queue all coaching sessions with sufficient messages
INSERT INTO public.extraction_queue (
    user_id,
    source_type,
    source_id,
    content_snapshot,
    content_hash,
    priority
)
SELECT
    cs.user_id,
    'coaching_session',
    cs.id,
    string_agg(cm.role || ': ' || cm.content, E'\n\n' ORDER BY cm.created_at),
    calculate_content_hash(string_agg(cm.role || ': ' || cm.content, E'\n\n' ORDER BY cm.created_at)),
    -1
FROM public.coaching_sessions cs
JOIN public.coaching_messages cm ON cm.session_id = cs.id
GROUP BY cs.id, cs.user_id
HAVING COUNT(cm.id) >= 4
ON CONFLICT (user_id, source_type, source_id, content_hash) DO NOTHING;

-- Verify results
SELECT 'Extraction queue items:' as info, COUNT(*) as count FROM public.extraction_queue
UNION ALL
SELECT 'Pending items:' as info, COUNT(*) FROM public.extraction_queue WHERE status = 'pending'
UNION ALL
SELECT 'Document sources:' as info, COUNT(*) FROM public.extraction_queue WHERE source_type = 'document'
UNION ALL
SELECT 'Coaching sources:' as info, COUNT(*) FROM public.extraction_queue WHERE source_type = 'coaching_session';
