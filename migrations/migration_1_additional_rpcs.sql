-- Additional RPC needed for Migration 1: set_access_code
-- Run this in Supabase SQL Editor after the main migration blocks (A1-A12)

create or replace function public.set_access_code(p_sign_token text, p_code text)
returns jsonb language plpgsql security definer as $$
begin
  update public.signers
  set access_code_hash = crypt(p_code, gen_salt('bf', 10))
  where sign_token = p_sign_token;

  if not found then
    return jsonb_build_object('error', 'invalid_token');
  end if;

  return jsonb_build_object('success', true);
end;
$$;
