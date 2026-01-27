ALTER TABLE public.extraction_queue ADD COLUMN IF NOT EXISTS notes_refined INTEGER DEFAULT 0;
