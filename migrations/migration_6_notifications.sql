-- Migration 6: In-app notifications.
-- Per-user feed of meaningful envelope state transitions. Triggers generate
-- entries on signer status change (signed/declined) and envelope completion.
-- signer_first_view is deferred: signers.status check constraint doesn't allow
-- 'viewed', so the spec's trigger condition can't fire. Add when viewed is
-- modeled (likely via audit_events).

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  envelope_id uuid references public.envelopes(id) on delete cascade,
  signer_id uuid references public.signers(id) on delete set null,
  event_type text not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, created_at desc)
  where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Users can delete own notifications" on public.notifications;

create policy "Users can view own notifications" on public.notifications
  for select using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications
  for update using (auth.uid() = user_id);
create policy "Users can delete own notifications" on public.notifications
  for delete using (auth.uid() = user_id);

-- Trigger 1: signer status transitions → notification (signed / declined).
create or replace function public.trg_signer_create_notification()
returns trigger language plpgsql security definer
set search_path = public as $func$
declare
  v_envelope record;
  v_event_type text;
  v_title text;
  v_who text;
begin
  if old.status = new.status then return new; end if;

  select id, user_id, name into v_envelope from public.envelopes where id = new.envelope_id;
  if v_envelope.id is null then return new; end if;

  v_who := coalesce(nullif(trim(new.name), ''), new.email, 'A signer');

  if new.status = 'signed' then
    v_event_type := 'signer_signed';
    v_title := v_who || ' signed ' || coalesce(v_envelope.name, 'your envelope');
  elsif new.status = 'declined' then
    v_event_type := 'signer_declined';
    v_title := v_who || ' declined to sign ' || coalesce(v_envelope.name, 'your envelope');
  else
    return new;
  end if;

  insert into public.notifications (user_id, envelope_id, signer_id, event_type, title)
  values (v_envelope.user_id, new.envelope_id, new.id, v_event_type, v_title);

  return new;
end $func$;

drop trigger if exists trg_signer_notification on public.signers;
create trigger trg_signer_notification
after update on public.signers
for each row execute function public.trg_signer_create_notification();

-- Trigger 2: envelope flips to completed → notification.
create or replace function public.trg_envelope_completed_notification()
returns trigger language plpgsql security definer
set search_path = public as $func$
begin
  if old.status = new.status or new.status <> 'completed' then return new; end if;

  insert into public.notifications (user_id, envelope_id, event_type, title, body)
  values (
    new.user_id,
    new.id,
    'envelope_completed',
    coalesce(new.name, 'Your envelope') || ' is fully signed',
    'All signers have completed. The signed document is ready to download.'
  );
  return new;
end $func$;

drop trigger if exists trg_envelope_complete_notification on public.envelopes;
create trigger trg_envelope_complete_notification
after update on public.envelopes
for each row execute function public.trg_envelope_completed_notification();

-- List RPC.
create or replace function public.get_notifications_for_user(
  p_only_unread boolean default false,
  p_limit int default 50
)
returns table (
  id uuid,
  envelope_id uuid,
  envelope_name text,
  signer_id uuid,
  event_type text,
  title text,
  body text,
  is_read boolean,
  read_at timestamptz,
  created_at timestamptz
) language sql security definer stable
set search_path = public as $func$
  select
    n.id, n.envelope_id, e.name as envelope_name, n.signer_id,
    n.event_type, n.title, n.body, n.is_read, n.read_at, n.created_at
  from public.notifications n
  left join public.envelopes e on e.id = n.envelope_id
  where n.user_id = auth.uid()
    and (not p_only_unread or n.is_read = false)
  order by n.created_at desc
  limit p_limit;
$func$;

grant execute on function public.get_notifications_for_user(boolean, int) to authenticated;

-- Unread count RPC.
create or replace function public.get_unread_notification_count()
returns int language sql security definer stable
set search_path = public as $func$
  select count(*)::int from public.notifications
  where user_id = auth.uid() and is_read = false;
$func$;

grant execute on function public.get_unread_notification_count() to authenticated;

-- Mark all as read.
create or replace function public.mark_all_notifications_read()
returns int language sql security definer
set search_path = public as $func$
  with updated as (
    update public.notifications
    set is_read = true, read_at = now()
    where user_id = auth.uid() and is_read = false
    returning 1
  )
  select count(*)::int from updated;
$func$;

grant execute on function public.mark_all_notifications_read() to authenticated;
