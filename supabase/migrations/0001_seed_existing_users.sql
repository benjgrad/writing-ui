-- Migration: 0001_seed_existing_users
-- Description: Create profiles for any existing auth users (run after initial schema)
-- Created: 2024-12-27

-- Insert profiles for existing users who don't have one yet
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles)
ON CONFLICT (id) DO NOTHING;
