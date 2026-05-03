-- =============================================
-- Legacy Sign Database Setup
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- =============================================

-- 1. ENVELOPES TABLE
create table public.envelopes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'in_progress', 'completed', 'declined')),
  routing text not null default 'sequential',
  pages integer not null default 1,
  pdf_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.envelopes enable row level security;

create policy "Users can view own envelopes"
  on public.envelopes for select using (auth.uid() = user_id);
create policy "Users can create own envelopes"
  on public.envelopes for insert with check (auth.uid() = user_id);
create policy "Users can update own envelopes"
  on public.envelopes for update using (auth.uid() = user_id);
create policy "Users can delete own envelopes"
  on public.envelopes for delete using (auth.uid() = user_id);


-- 2. SIGNERS TABLE
create table public.signers (
  id uuid default gen_random_uuid() primary key,
  envelope_id uuid references public.envelopes(id) on delete cascade not null,
  name text not null default '',
  email text not null default '',
  role text not null default 'Signer',
  status text not null default 'pending' check (status in ('pending', 'waiting', 'signed', 'declined')),
  sort_order integer not null default 0,
  signed_at timestamptz,
  sign_token text unique,
  access_code text,
  access_attempts integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.signers enable row level security;

-- Envelope owners can manage signers
create policy "Users can view signers on own envelopes"
  on public.signers for select using (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );
create policy "Users can create signers on own envelopes"
  on public.signers for insert with check (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );
create policy "Users can update signers on own envelopes"
  on public.signers for update using (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );
create policy "Users can delete signers on own envelopes"
  on public.signers for delete using (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );

-- Signers can view and update themselves via sign_token (public signing)
create policy "Signers can view own record via token"
  on public.signers for select using (true);
create policy "Signers can update own record via token"
  on public.signers for update using (true);


-- 3. FIELDS TABLE
create table public.fields (
  id uuid default gen_random_uuid() primary key,
  envelope_id uuid references public.envelopes(id) on delete cascade not null,
  signer_index integer not null default 0,
  type text not null check (type in ('signature', 'initials', 'date', 'text')),
  page integer not null default 0,
  x numeric not null,
  y numeric not null,
  w numeric not null,
  h numeric not null,
  value text,
  created_at timestamptz default now() not null
);

alter table public.fields enable row level security;

create policy "Users can view fields on own envelopes"
  on public.fields for select using (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );
create policy "Users can create fields on own envelopes"
  on public.fields for insert with check (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );
create policy "Users can update fields on own envelopes"
  on public.fields for update using (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );
create policy "Users can delete fields on own envelopes"
  on public.fields for delete using (
    exists (select 1 from public.envelopes where id = envelope_id and user_id = auth.uid())
  );

-- Public access for signing flow
create policy "Public can view fields for signing"
  on public.fields for select using (true);
create policy "Public can update field values for signing"
  on public.fields for update using (true);


-- 4. EMAILS TABLE
create table public.emails (
  id uuid default gen_random_uuid() primary key,
  envelope_id uuid references public.envelopes(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  to_email text not null,
  to_name text not null default '',
  type text not null default 'request',
  subject text not null,
  signing_url text,
  status text not null default 'sending',
  sent_at timestamptz default now() not null,
  delivered_at timestamptz,
  opened_at timestamptz,
  postmark_id text
);

alter table public.emails enable row level security;

create policy "Users can view own emails"
  on public.emails for select using (auth.uid() = user_id);
create policy "Users can create own emails"
  on public.emails for insert with check (auth.uid() = user_id);
create policy "Users can update own emails"
  on public.emails for update using (auth.uid() = user_id);


-- 5. TEMPLATES TABLE
create table public.templates (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text not null default '',
  pages integer not null default 1,
  signer_roles text[] not null default '{}',
  fields jsonb not null default '[]',
  usage_count integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.templates enable row level security;

create policy "Users can view own templates"
  on public.templates for select using (auth.uid() = user_id);
create policy "Users can create own templates"
  on public.templates for insert with check (auth.uid() = user_id);
create policy "Users can update own templates"
  on public.templates for update using (auth.uid() = user_id);
create policy "Users can delete own templates"
  on public.templates for delete using (auth.uid() = user_id);


-- 6. PDF STORAGE BUCKET
insert into storage.buckets (id, name, public) values ('pdfs', 'pdfs', false);

create policy "Users can upload PDFs"
  on storage.objects for insert with check (
    bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "Users can view own PDFs"
  on storage.objects for select using (
    bucket_id = 'pdfs' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "Public can view PDFs for signing"
  on storage.objects for select using (
    bucket_id = 'pdfs'
  );


-- 7. HELPER FUNCTION: get envelope for signing (bypasses RLS)
-- Returns has_access_code flag but NEVER the actual code to the client
create or replace function public.get_envelope_for_signing(sign_token_param text)
returns json language plpgsql security definer as $$
declare
  signer_row record;
  envelope_row record;
  result json;
begin
  select * into signer_row from public.signers where sign_token = sign_token_param;
  if not found then return null; end if;

  select * into envelope_row from public.envelopes where id = signer_row.envelope_id;
  if not found then return null; end if;

  select json_build_object(
    'envelope', row_to_json(envelope_row),
    'signer', json_build_object(
      'id', signer_row.id,
      'envelope_id', signer_row.envelope_id,
      'name', signer_row.name,
      'email', signer_row.email,
      'role', signer_row.role,
      'status', signer_row.status,
      'sort_order', signer_row.sort_order,
      'signed_at', signer_row.signed_at,
      'sign_token', signer_row.sign_token,
      'created_at', signer_row.created_at,
      'has_access_code', (signer_row.access_code is not null),
      'access_attempts', signer_row.access_attempts
    ),
    'signers', (
      select json_agg(json_build_object(
        'id', s.id, 'envelope_id', s.envelope_id, 'name', s.name, 'email', s.email,
        'role', s.role, 'status', s.status, 'sort_order', s.sort_order,
        'signed_at', s.signed_at, 'sign_token', s.sign_token, 'created_at', s.created_at,
        'has_access_code', (s.access_code is not null), 'access_attempts', s.access_attempts
      ) order by s.sort_order)
      from public.signers s where s.envelope_id = envelope_row.id
    ),
    'fields', (select json_agg(row_to_json(f)) from public.fields f where f.envelope_id = envelope_row.id)
  ) into result;

  return result;
end;
$$;


-- 8. ACCESS CODE VERIFICATION (bypasses RLS, compares server-side only)
create or replace function public.verify_access_code(p_sign_token text, p_code text)
returns jsonb language plpgsql security definer as $$
declare
  v_signer record;
begin
  select * into v_signer from public.signers where sign_token = p_sign_token;

  if v_signer is null then
    return '{"error": "invalid_token"}'::jsonb;
  end if;

  -- No access code set — allow through
  if v_signer.access_code is null then
    return jsonb_build_object('verified', true);
  end if;

  -- Locked out after 5 attempts
  if v_signer.access_attempts >= 5 then
    return jsonb_build_object('locked', true);
  end if;

  -- Correct code
  if v_signer.access_code = p_code then
    update public.signers set access_attempts = 0 where sign_token = p_sign_token;
    return jsonb_build_object('verified', true);
  end if;

  -- Wrong code
  update public.signers set access_attempts = access_attempts + 1 where sign_token = p_sign_token;
  return jsonb_build_object(
    'verified', false,
    'attempts_remaining', 5 - (v_signer.access_attempts + 1)
  );
end;
$$;


-- 9. MIGRATION: Add access code columns to signers (run if table already exists)
-- alter table public.signers add column access_code text;
-- alter table public.signers add column access_attempts integer not null default 0;
