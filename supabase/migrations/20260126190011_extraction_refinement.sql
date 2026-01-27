ALTER TABLE public.extraction_queue ADD COLUMN IF NOT EXISTS refinement_attempts INTEGER DEFAULT 0;
