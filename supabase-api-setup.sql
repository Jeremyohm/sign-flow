-- =============================================
-- Legacy Sign API & Monetization Schema
-- Run this in Supabase SQL Editor AFTER the base setup
-- =============================================

-- 1. API KEYS TABLE
create table public.api_keys (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'Default',
  key_hash text not null unique,
  key_prefix text not null,        -- first 8 chars for display (sf_live_abc12345...)
  scopes text[] not null default '{envelopes.read,envelopes.write,templates.read,templates.write,webhooks.manage}',
  last_used_at timestamptz,
  created_at timestamptz default now() not null,
  revoked_at timestamptz
);

alter table public.api_keys enable row level security;

create policy "Users can view own API keys"
  on public.api_keys for select using (auth.uid() = user_id);
create policy "Users can create own API keys"
  on public.api_keys for insert with check (auth.uid() = user_id);
create policy "Users can update own API keys"
  on public.api_keys for update using (auth.uid() = user_id);
create policy "Users can delete own API keys"
  on public.api_keys for delete using (auth.uid() = user_id);


-- 2. WEBHOOKS TABLE
create table public.webhooks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  url text not null,
  events text[] not null default '{envelope.sent,envelope.completed,signer.signed}',
  secret text not null,            -- HMAC signing secret
  active boolean not null default true,
  last_triggered_at timestamptz,
  failure_count integer not null default 0,
  created_at timestamptz default now() not null
);

alter table public.webhooks enable row level security;

create policy "Users can view own webhooks"
  on public.webhooks for select using (auth.uid() = user_id);
create policy "Users can create own webhooks"
  on public.webhooks for insert with check (auth.uid() = user_id);
create policy "Users can update own webhooks"
  on public.webhooks for update using (auth.uid() = user_id);
create policy "Users can delete own webhooks"
  on public.webhooks for delete using (auth.uid() = user_id);


-- 3. WEBHOOK DELIVERIES LOG
create table public.webhook_deliveries (
  id uuid default gen_random_uuid() primary key,
  webhook_id uuid references public.webhooks(id) on delete cascade not null,
  event text not null,
  payload jsonb not null,
  response_status integer,
  response_body text,
  delivered_at timestamptz default now() not null,
  success boolean not null default false
);

alter table public.webhook_deliveries enable row level security;

create policy "Users can view own webhook deliveries"
  on public.webhook_deliveries for select using (
    exists (select 1 from public.webhooks where id = webhook_id and user_id = auth.uid())
  );


-- 4. SUBSCRIPTION / BILLING TABLE
create table public.subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null unique,
  plan text not null default 'free' check (plan in ('free', 'pro', 'business', 'enterprise')),
  stripe_customer_id text,
  stripe_subscription_id text,
  envelope_limit integer not null default 5,      -- per month
  envelopes_used integer not null default 0,
  api_access boolean not null default false,
  current_period_start timestamptz default now(),
  current_period_end timestamptz default (now() + interval '30 days'),
  created_at timestamptz default now() not null
);

alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select using (auth.uid() = user_id);
create policy "Users can update own subscription"
  on public.subscriptions for update using (auth.uid() = user_id);


-- 5. API USAGE LOG (for rate limiting and analytics)
create table public.api_usage (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null,
  method text not null,
  status_code integer,
  created_at timestamptz default now() not null
);

alter table public.api_usage enable row level security;

create policy "Users can view own API usage"
  on public.api_usage for select using (auth.uid() = user_id);


-- 6. RPC: Validate API key and return user info (security definer, bypasses RLS)
create or replace function public.validate_api_key(p_key_hash text)
returns json language plpgsql security definer as $$
declare
  v_key record;
  v_sub record;
begin
  select * into v_key from public.api_keys
    where key_hash = p_key_hash and revoked_at is null;

  if not found then return null; end if;

  -- Update last used
  update public.api_keys set last_used_at = now() where id = v_key.id;

  -- Get subscription
  select * into v_sub from public.subscriptions where user_id = v_key.user_id;

  return json_build_object(
    'user_id', v_key.user_id,
    'key_id', v_key.id,
    'scopes', v_key.scopes,
    'plan', coalesce(v_sub.plan, 'free'),
    'api_access', coalesce(v_sub.api_access, false),
    'envelope_limit', coalesce(v_sub.envelope_limit, 5),
    'envelopes_used', coalesce(v_sub.envelopes_used, 0)
  );
end;
$$;


-- 7. RPC: Get webhooks for a user (for internal event dispatch)
create or replace function public.get_active_webhooks(p_user_id uuid, p_event text)
returns json language plpgsql security definer as $$
begin
  return (
    select json_agg(row_to_json(w))
    from public.webhooks w
    where w.user_id = p_user_id
      and w.active = true
      and p_event = any(w.events)
      and w.failure_count < 10
  );
end;
$$;


-- 8. Auto-create subscription for new users
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.subscriptions (user_id, plan, envelope_limit, api_access)
  values (new.id, 'free', 5, false);
  return new;
end;
$$;

-- Drop trigger if it exists, then create
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
