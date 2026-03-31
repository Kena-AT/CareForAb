-- Migration: Add form_type to medications table
-- Run this in the Supabase SQL Editor if the table already exists

ALTER TABLE public.medications
ADD COLUMN IF NOT EXISTS form_type TEXT DEFAULT 'tablet'
  CHECK (form_type IN ('tablet', 'capsule', 'injection', 'liquid', 'patch', 'inhaler', 'other'));

-- Backfill existing rows to 'tablet' as default
UPDATE public.medications SET form_type = 'tablet' WHERE form_type IS NULL;
