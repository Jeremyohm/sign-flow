-- Migration 3c: Recipient type on signers (signer | cc) + sequential trigger
-- skips CC rows.
--
-- Run via Supabase SQL editor.

-- 1. Add recipient_type column.
alter table public.signers
  add column if not exists recipient_type text not null default 'signer'
  check (recipient_type in ('signer', 'cc'));

-- 2. Replace the sequential-signing trigger function so it skips CC rows
--    when looking for the next signer to email. Also: CC rows never trigger
--    the next-signer queue (they aren't expected to sign).
create or replace function public.trg_signer_signed_queue_next_email()
returns trigger language plpgsql as $$
declare
  v_envelope record;
  v_next_signer record;
begin
  -- Only fire when status transitions to 'signed'.
  if old.status = 'signed' or new.status != 'signed' then
    return new;
  end if;

  -- CC recipients shouldn't ever flip to 'signed' under normal flows, but
  -- guard anyway: a CC reaching this branch should not propagate.
  if new.recipient_type = 'cc' then
    return new;
  end if;

  select * into v_envelope from public.envelopes where id = new.envelope_id;
  if v_envelope.routing != 'sequential' then return new; end if;

  -- Find the next signer with sort_order > current AND recipient_type = 'signer'.
  select * into v_next_signer
    from public.signers
    where envelope_id = new.envelope_id
      and sort_order > new.sort_order
      and recipient_type = 'signer'
      and status not in ('signed', 'declined')
    order by sort_order asc
    limit 1;

  if not found then return new; end if;

  insert into public.email_outbox (envelope_id, signer_id, to_email, to_name, subject, email_type, template_data)
  values (
    new.envelope_id,
    v_next_signer.id,
    v_next_signer.email,
    v_next_signer.name,
    'You have a document to sign: ' || v_envelope.name,
    'signing_request',
    jsonb_build_object(
      'envelope_name', v_envelope.name,
      'signer_name', v_next_signer.name,
      'sign_token', v_next_signer.sign_token
    )
  );

  update public.signers set status = 'pending' where id = v_next_signer.id;
  return new;
end;
$$;

-- The existing trigger binding (on signers AFTER UPDATE) already points at
-- this function name, so no DROP/CREATE TRIGGER needed.

-- 3. Verify
do $$
declare v_col int;
begin
  select count(*) into v_col from information_schema.columns
    where table_schema = 'public' and table_name = 'signers' and column_name = 'recipient_type';
  if v_col != 1 then raise exception '3c failed: recipient_type column missing'; end if;
  raise notice 'Migration 3c verified complete';
end $$;
