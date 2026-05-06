-- Migration 3d: Template feature columns.
-- Adds pdf_url + original_pdf_sha256 (so templates own their document copy)
-- and last_used_at for the Templates page sort/display.

alter table public.templates
  add column if not exists pdf_url text,
  add column if not exists original_pdf_sha256 text,
  add column if not exists last_used_at timestamptz;

-- Verify
do $$
declare v int;
begin
  select count(*) into v from information_schema.columns
    where table_schema = 'public' and table_name = 'templates'
    and column_name in ('pdf_url', 'original_pdf_sha256', 'last_used_at');
  if v != 3 then raise exception 'Migration 3d failed: missing columns (got %)', v; end if;
  raise notice 'Migration 3d verified complete';
end $$;
