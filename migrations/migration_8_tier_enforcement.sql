-- Migration 8: Tier enforcement.
-- Server-side limit checks via RPC helpers (read by frontend) + before-mutation
-- triggers (hard backstop on the database side).

-- ────────────────── Helper RPCs ──────────────────

-- Returns per-user limits. NULL = unlimited.
create or replace function public.get_user_tier_limits()
returns table (
  tier text,
  envelopes_per_month int,
  recipients_per_envelope int,
  max_templates int,
  history_days int,
  show_branding boolean
) language sql security definer stable
set search_path = public as $func$
  with t as (
    select coalesce(s.plan, 'free') as p
    from auth.users u
    left join public.subscriptions s on s.user_id = u.id
    where u.id = auth.uid()
    limit 1
  )
  select
    t.p as tier,
    case t.p when 'free' then 3 else null end::int as envelopes_per_month,
    case t.p when 'free' then 2 else null end::int as recipients_per_envelope,
    case t.p when 'free' then 2 else null end::int as max_templates,
    case t.p when 'free' then 30 else null end::int as history_days,
    (t.p = 'free') as show_branding
  from t;
$func$;

grant execute on function public.get_user_tier_limits() to authenticated;

-- Returns current usage.
create or replace function public.get_user_usage()
returns table (
  envelopes_this_month int,
  template_count int,
  next_reset_date timestamptz
) language sql security definer stable
set search_path = public as $func$
  select
    (select count(*)::int from public.envelopes
       where user_id = auth.uid()
         and created_at >= date_trunc('month', now())
         and status <> 'draft') as envelopes_this_month,
    (select count(*)::int from public.templates
       where user_id = auth.uid()) as template_count,
    (date_trunc('month', now()) + interval '1 month')::timestamptz as next_reset_date;
$func$;

grant execute on function public.get_user_usage() to authenticated;

-- ────────────────── Triggers ──────────────────

-- Envelope monthly send cap. Fires only on the draft → sent transition.
create or replace function public.check_envelope_limit()
returns trigger language plpgsql security definer
set search_path = public as $func$
declare
  v_plan text;
  v_used int;
begin
  if new.status <> 'sent' or coalesce(old.status, '') = 'sent' then
    return new;
  end if;

  select coalesce(plan, 'free') into v_plan from public.subscriptions where user_id = new.user_id;
  v_plan := coalesce(v_plan, 'free');
  if v_plan <> 'free' then return new; end if;

  select count(*) into v_used
  from public.envelopes
  where user_id = new.user_id
    and created_at >= date_trunc('month', now())
    and status <> 'draft'
    and id <> new.id;

  if v_used >= 3 then
    raise exception 'envelope_limit_reached'
      using hint = 'Free tier allows 3 envelopes per month';
  end if;
  return new;
end $func$;

drop trigger if exists trg_envelope_limit_check on public.envelopes;
create trigger trg_envelope_limit_check
before update on public.envelopes
for each row execute function public.check_envelope_limit();

-- Recipient cap. Counts signers (recipient_type='signer') at send time.
create or replace function public.check_recipient_limit()
returns trigger language plpgsql security definer
set search_path = public as $func$
declare
  v_plan text;
  v_count int;
begin
  if new.status <> 'sent' or coalesce(old.status, '') = 'sent' then
    return new;
  end if;

  select coalesce(plan, 'free') into v_plan from public.subscriptions where user_id = new.user_id;
  v_plan := coalesce(v_plan, 'free');
  if v_plan <> 'free' then return new; end if;

  select count(*) into v_count
  from public.signers
  where envelope_id = new.id and recipient_type = 'signer';

  if v_count > 2 then
    raise exception 'recipient_limit_reached'
      using hint = 'Free tier allows 2 signing recipients per envelope';
  end if;
  return new;
end $func$;

drop trigger if exists trg_recipient_limit_check on public.envelopes;
create trigger trg_recipient_limit_check
before update on public.envelopes
for each row execute function public.check_recipient_limit();

-- Template cap on insert.
create or replace function public.check_template_limit()
returns trigger language plpgsql security definer
set search_path = public as $func$
declare
  v_plan text;
  v_used int;
begin
  select coalesce(plan, 'free') into v_plan from public.subscriptions where user_id = new.user_id;
  v_plan := coalesce(v_plan, 'free');
  if v_plan <> 'free' then return new; end if;

  select count(*) into v_used from public.templates where user_id = new.user_id;
  if v_used >= 2 then
    raise exception 'template_limit_reached'
      using hint = 'Free tier allows 2 saved templates';
  end if;
  return new;
end $func$;

drop trigger if exists trg_template_limit_check on public.templates;
create trigger trg_template_limit_check
before insert on public.templates
for each row execute function public.check_template_limit();
