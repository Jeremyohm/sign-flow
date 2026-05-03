-- Add date_signed field type support
-- Run this in Supabase SQL Editor

ALTER TABLE public.fields DROP CONSTRAINT IF EXISTS fields_type_check;
ALTER TABLE public.fields ADD CONSTRAINT fields_type_check
  CHECK (type IN ('signature', 'initials', 'date', 'text', 'dropdown', 'date_signed'));
