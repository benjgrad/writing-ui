ALTER TABLE public.atomic_notes ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending';
