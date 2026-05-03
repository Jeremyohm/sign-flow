-- Add dropdown field type support
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/cfoeshzynalhsfrvotmz/sql/new

-- 1. Update the type check constraint to allow 'dropdown'
ALTER TABLE public.fields DROP CONSTRAINT IF EXISTS fields_type_check;
ALTER TABLE public.fields ADD CONSTRAINT fields_type_check
  CHECK (type IN ('signature', 'initials', 'date', 'text', 'dropdown'));

-- 2. Add options column for dropdown choices
ALTER TABLE public.fields ADD COLUMN IF NOT EXISTS options jsonb DEFAULT NULL;
