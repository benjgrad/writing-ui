ALTER TABLE public.extraction_queue ADD COLUMN IF NOT EXISTS nvq_metrics JSONB;
