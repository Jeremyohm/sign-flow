-- Migration 5: Reports analytics RPC.
-- Single-call analytics: top-line stats with previous-period comparison,
-- volume series (daily/weekly/monthly based on range), status breakdown,
-- top recipients. All scoped to auth.uid().
--
-- p_range_days: 7, 30, 90, 365, or NULL for "all time".

create or replace function public.get_reports_for_user(p_range_days int default 30)
returns jsonb
language plpgsql security definer stable
as $$
declare
  v_user uuid := auth.uid();
  v_range interval := case when p_range_days is null then null else (p_range_days || ' days')::interval end;
  v_prev_start timestamptz := case when v_range is null then null else now() - 2 * v_range end;
  v_curr_start timestamptz := case when v_range is null then null else now() - v_range end;
  v_bucket text := case
    when p_range_days is null then 'month'
    when p_range_days > 90 then 'week'
    else 'day'
  end;
  result jsonb;
begin
  with
  curr_envs as (
    select * from public.envelopes
    where user_id = v_user
      and (v_curr_start is null or created_at >= v_curr_start)
  ),
  prev_envs as (
    select * from public.envelopes
    where user_id = v_user
      and v_prev_start is not null
      and created_at >= v_prev_start
      and created_at < v_curr_start
  ),
  stats as (
    select
      (select count(*) from curr_envs) as sent_count,
      (select count(*) from curr_envs where status = 'completed') as completed_count,
      (select extract(epoch from avg(updated_at - created_at))::numeric
         from curr_envs where status = 'completed') as avg_secs,
      (select count(*) from prev_envs) as prev_sent_count,
      (select count(*) from prev_envs where status = 'completed') as prev_completed_count,
      (select extract(epoch from avg(updated_at - created_at))::numeric
         from prev_envs where status = 'completed') as prev_avg_secs
  ),
  volume as (
    select jsonb_agg(jsonb_build_object(
      'date', bucket::date,
      'sent', sent,
      'completed', completed
    ) order by bucket) as series
    from (
      select
        date_trunc(v_bucket, created_at) as bucket,
        count(*) as sent,
        count(*) filter (where status = 'completed') as completed
      from curr_envs
      group by date_trunc(v_bucket, created_at)
    ) s
  ),
  status_b as (
    select jsonb_agg(jsonb_build_object('category', category, 'count', n)) as breakdown
    from (
      select
        case
          when status = 'completed' then 'Completed'
          when status in ('sent', 'in_progress') then 'In progress'
          when status in ('declined', 'voided', 'expired') then 'Voided/expired'
          else 'Draft'
        end as category,
        count(*) as n
      from curr_envs
      group by 1
    ) c
  ),
  top_recip as (
    select jsonb_agg(jsonb_build_object(
      'email', email,
      'display_name', display_name,
      'derived_name', derived_name,
      'envelope_count', envelope_count,
      'last_activity', last_activity
    ) order by envelope_count desc) as recipients
    from (
      select
        lower(s.email) as email,
        max(c.display_name) as display_name,
        (array_agg(s.name order by s.created_at desc)
           filter (where coalesce(s.name, '') <> ''))[1] as derived_name,
        count(distinct s.envelope_id) as envelope_count,
        max(coalesce(s.signed_at, s.created_at)) as last_activity
      from public.signers s
      join curr_envs e on e.id = s.envelope_id
      left join public.contacts c on c.user_id = v_user and c.email = lower(s.email)
      where coalesce(s.email, '') <> ''
      group by lower(s.email)
      order by envelope_count desc
      limit 10
    ) r
  ),
  ever as (
    select count(*) as total_ever
    from public.envelopes where user_id = v_user
  )
  select jsonb_build_object(
    'range_days', p_range_days,
    'bucket', v_bucket,
    'total_ever', (select total_ever from ever),
    'stats', jsonb_build_object(
      'sent_count', coalesce((select sent_count from stats), 0),
      'completed_count', coalesce((select completed_count from stats), 0),
      'avg_seconds', (select avg_secs from stats),
      'prev_sent_count', coalesce((select prev_sent_count from stats), 0),
      'prev_completed_count', coalesce((select prev_completed_count from stats), 0),
      'prev_avg_seconds', (select prev_avg_secs from stats)
    ),
    'volume', coalesce((select series from volume), '[]'::jsonb),
    'status_breakdown', coalesce((select breakdown from status_b), '[]'::jsonb),
    'top_recipients', coalesce((select recipients from top_recip), '[]'::jsonb)
  ) into result;

  return result;
end $$;

grant execute on function public.get_reports_for_user(int) to authenticated;
