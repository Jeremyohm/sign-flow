import { getSupabase } from "./_lib/auth.js";
import { checkRateLimit } from "./_lib/rate-limit.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  const corsHeaders = { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" };

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const ua = request.headers.get("user-agent") || "unknown";

  const ipRl = await checkRateLimit(env.RATE_LIMIT_KV, `sign:${ip}`, 60, 60);
  if (!ipRl.allowed) {
    return new Response(JSON.stringify({ error: "rate_limited", retry_after: ipRl.retryAfter }), {
      status: 429, headers: { ...corsHeaders, "Retry-After": String(ipRl.retryAfter) },
    });
  }

  const body = await request.json().catch(() => null);
  if (!body) return new Response(JSON.stringify({ error: "invalid_body" }), { status: 400, headers: corsHeaders });

  const { sign_token, code } = body;
  if (!sign_token || !code) {
    return new Response(JSON.stringify({ error: "missing_params" }), { status: 400, headers: corsHeaders });
  }

  // Per-token: 5 attempts per hour. Complements DB attempt counter (rate-based vs total).
  const tokenRl = await checkRateLimit(env.RATE_LIMIT_KV, `accesscode:${sign_token}`, 5, 3600);
  if (!tokenRl.allowed) {
    return new Response(JSON.stringify({ error: "rate_limited", retry_after: tokenRl.retryAfter }), {
      status: 429, headers: { ...corsHeaders, "Retry-After": String(tokenRl.retryAfter) },
    });
  }

  const supabase = getSupabase(env);
  const { data, error } = await supabase.rpc("verify_access_code", {
    p_sign_token: sign_token,
    p_code: code,
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
