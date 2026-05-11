-- Migration 7: Subscription lifecycle columns + auto-seed + RPC.
-- The subscriptions table was created in supabase-api-setup.sql with envelope
-- usage tracking but without lifecycle status. Add the three columns the
-- Settings page + webhook handlers need.

alter table public.subscriptions
  add column if not exists status text not null default 'active'
    check (status in ('active', 'past_due', 'canceled', 'paused')),
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_subscriptions_user
  on public.subscriptions(user_id);
create index if not exists idx_subscriptions_stripe_customer
  on public.subscriptions(stripe_customer_id);

-- Auto-seed a free subscription row when a new auth user signs up.
create or replace function public.trg_user_create_free_subscription()
returns trigger language plpgsql security definer
set search_path = public as $func$
begin
  insert into public.subscriptions (user_id, plan, status, envelope_limit, api_access)
  values (new.id, 'free', 'active', 5, false)
  on conflict (user_id) do nothing;
  return new;
end $func$;

drop trigger if exists trg_user_subscription_init on auth.users;
create trigger trg_user_subscription_init
after insert on auth.users
for each row execute function public.trg_user_create_free_subscription();

-- Backfill rows for any existing users who don't have a subscription yet.
insert into public.subscriptions (user_id, plan, status, envelope_limit, api_access)
select id, 'free', 'active', 5, false from auth.users
on conflict (user_id) do nothing;

-- Helper used by Settings to read the current user's subscription in one call.
create or replace function public.get_user_subscription()
returns table (
  plan text,
  status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean,
  stripe_customer_id text,
  stripe_subscription_id text
) language sql security definer stable
set search_path = public as $func$
  select plan, status, current_period_end, cancel_at_period_end,
         stripe_customer_id, stripe_subscription_id
  from public.subscriptions
  where user_id = auth.uid()
  limit 1;
$func$;

grant execute on function public.get_user_subscription() to authenticated;
