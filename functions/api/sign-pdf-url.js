import { getSupabase } from "./_lib/auth.js";
import { checkRateLimit } from "./_lib/rate-limit.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  const ip = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
  const rl = await checkRateLimit(env.RATE_LIMIT_KV, `sign:${ip}`, 60, 60);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ error: "rate_limited", retry_after: rl.retryAfter }), {
      status: 429, headers: { ...corsHeaders, "Retry-After": String(rl.retryAfter) },
    });
  }

  try {
    const { sign_token } = await request.json();
    if (!sign_token) {
      return new Response(JSON.stringify({ error: "missing_token" }), { status: 400, headers: corsHeaders });
    }

    const supabase = getSupabase(env);

    // Validate token via RPC
    const { data: envelope, error } = await supabase.rpc("get_envelope_for_signing", {
      sign_token_param: sign_token,
    });

    if (error || !envelope || envelope.error) {
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 403, headers: corsHeaders });
    }

    const pdfUrl = envelope.envelope?.pdf_url;
    if (!pdfUrl) {
      return new Response(JSON.stringify({ error: "no_pdf" }), { status: 404, headers: corsHeaders });
    }

    // Generate signed URL (5 minute expiry)
    const { data: signed, error: signError } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(pdfUrl, 300);

    if (signError) {
      return new Response(JSON.stringify({ error: "sign_url_failed" }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("sign-pdf-url error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), { status: 500, headers: corsHeaders });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
