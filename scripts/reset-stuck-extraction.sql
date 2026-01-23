-- Reset Stuck Extraction Jobs
-- Run this in Supabase SQL Editor to reset jobs stuck in 'processing' state

-- Reset jobs that have been processing for more than 5 minutes
UPDATE public.extraction_queue
SET
    status = 'pending',
    started_at = NULL
WHERE status = 'processing'
  AND started_at < NOW() - INTERVAL '5 minutes';

-- Also reset failed jobs so they can be retried
UPDATE public.extraction_queue
SET
    status = 'pending',
    started_at = NULL,
    error_message = NULL
WHERE status = 'failed'
  AND attempts < max_attempts;

-- Show current queue status
SELECT
    status,
    COUNT(*) as count
FROM public.extraction_queue
GROUP BY status
ORDER BY status;
