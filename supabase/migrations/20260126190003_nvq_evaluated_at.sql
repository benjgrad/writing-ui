ALTER TABLE public.atomic_notes ADD COLUMN IF NOT EXISTS nvq_evaluated_at TIMESTAMPTZ;
