-- Migration 4: Contacts directory
-- One row per (user, email) the user has ever sent to. Backfills from existing
-- signers, then keeps itself in sync via an after-insert trigger on signers.
-- Two RPCs surface aggregated read access for the Contacts tab.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email)
);

alter table public.contacts enable row level security;

drop policy if exists "Users can view own contacts" on public.contacts;
drop policy if exists "Users can update own contacts" on public.contacts;
drop policy if exists "Users can insert own contacts" on public.contacts;
drop policy if exists "Users can delete own contacts" on public.contacts;

create policy "Users can view own contacts" on public.contacts
  for select using (auth.uid() = user_id);
create policy "Users can update own contacts" on public.contacts
  for update using (auth.uid() = user_id);
create policy "Users can insert own contacts" on public.contacts
  for insert with check (auth.uid() = user_id);
create policy "Users can delete own contacts" on public.contacts
  for delete using (auth.uid() = user_id);

-- Backfill from existing signers. Most recent non-empty name becomes the
-- initial display_name; earliest send becomes created_at.
insert into public.contacts (user_id, email, display_name, created_at)
select
  e.user_id,
  lower(s.email) as email,
  (array_agg(s.name order by s.created_at desc) filter (where coalesce(s.name, '') <> ''))[1] as display_name,
  min(s.created_at)
from public.signers s
join public.envelopes e on e.id = s.envelope_id
where coalesce(s.email, '') <> ''
group by e.user_id, lower(s.email)
on conflict (user_id, email) do nothing;

-- Auto-sync trigger: every new signer inserts/updates a contacts row.
create or replace function public.trg_signer_create_contact()
returns trigger language plpgsql security definer as $$
begin
  if coalesce(new.email, '') = '' then return new; end if;
  insert into public.contacts (user_id, email, display_name)
  select e.user_id, lower(new.email), nullif(trim(new.name), '')
  from public.envelopes e
  where e.id = new.envelope_id
  on conflict (user_id, email) do update
    set display_name = coalesce(public.contacts.display_name, excluded.display_name),
        updated_at = now();
  return new;
end $$;

drop trigger if exists trg_signer_contact_sync on public.signers;
create trigger trg_signer_contact_sync
after insert on public.signers
for each row execute function public.trg_signer_create_contact();

-- Contacts list with per-contact envelope stats.
create or replace function public.get_contacts_for_user()
returns table (
  id uuid,
  email text,
  display_name text,
  derived_name text,
  is_hidden boolean,
  total_envelopes int,
  completed_count int,
  pending_count int,
  last_activity timestamptz
) language sql security definer stable as $$
  select
    c.id,
    c.email,
    c.display_name,
    (
      select s.name
      from public.signers s
      join public.envelopes e on e.id = s.envelope_id
      where e.user_id = c.user_id
        and lower(s.email) = c.email
        and coalesce(s.name, '') <> ''
      order by s.created_at desc
      limit 1
    ) as derived_name,
    c.is_hidden,
    coalesce(stats.total_envelopes, 0)::int as total_envelopes,
    coalesce(stats.completed_count, 0)::int as completed_count,
    coalesce(stats.pending_count, 0)::int as pending_count,
    coalesce(stats.last_activity, c.created_at) as last_activity
  from public.contacts c
  left join lateral (
    select
      count(distinct s.envelope_id) as total_envelopes,
      count(distinct s.envelope_id) filter (where s.status = 'signed') as completed_count,
      count(distinct s.envelope_id) filter (where s.status = 'pending') as pending_count,
      max(coalesce(s.signed_at, s.created_at)) as last_activity
    from public.signers s
    join public.envelopes e on e.id = s.envelope_id
    where e.user_id = c.user_id
      and lower(s.email) = c.email
  ) stats on true
  where c.user_id = auth.uid()
    and c.is_hidden = false
  order by last_activity desc nulls last;
$$;

grant execute on function public.get_contacts_for_user() to authenticated;

-- Detail RPC: envelopes for a single contact.
create or replace function public.get_contact_detail(p_contact_id uuid)
returns table (
  contact_id uuid,
  email text,
  display_name text,
  derived_name text,
  is_hidden boolean,
  envelopes jsonb
) language sql security definer stable as $$
  select
    c.id as contact_id,
    c.email,
    c.display_name,
    (
      select s.name
      from public.signers s
      join public.envelopes e on e.id = s.envelope_id
      where e.user_id = c.user_id
        and lower(s.email) = c.email
        and coalesce(s.name, '') <> ''
      order by s.created_at desc
      limit 1
    ) as derived_name,
    c.is_hidden,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'envelope_id', e.id,
        'envelope_name', e.name,
        'envelope_status', e.status,
        'signer_status', s.status,
        'created_at', e.created_at,
        'signed_at', s.signed_at
      ) order by e.created_at desc)
      from public.signers s
      join public.envelopes e on e.id = s.envelope_id
      where e.user_id = c.user_id
        and lower(s.email) = c.email
    ), '[]'::jsonb) as envelopes
  from public.contacts c
  where c.id = p_contact_id and c.user_id = auth.uid();
$$;

grant execute on function public.get_contact_detail(uuid) to authenticated;
