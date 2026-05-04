import { getSupabase } from "./_lib/auth.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  let body;
  try { body = await request.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: corsHeaders });
  }

  const { sign_token } = body;
  if (!sign_token) {
    return new Response(JSON.stringify({ error: "missing_token" }), { status: 400, headers: corsHeaders });
  }

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";

  const supabase = getSupabase(env);
  const { data, error } = await supabase.rpc("record_signer_view", {
    p_sign_token: sign_token,
    p_actor_ip: ip,
    p_actor_user_agent: ua,
  });

  if (error) {
    return new Response(JSON.stringify({ error: "rpc_failed", detail: error.message }), { status: 500, headers: corsHeaders });
  }
  return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  }});
}
