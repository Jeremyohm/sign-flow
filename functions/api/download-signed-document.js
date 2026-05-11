import { getSupabase } from "./_lib/auth.js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const envelopeId = url.searchParams.get("envelope_id");
  const signToken = url.searchParams.get("sign_token");

  if (!envelopeId) {
    return new Response(JSON.stringify({ error: "missing_envelope_id" }), { status: 400, headers: corsHeaders });
  }

  const supabase = getSupabase(env);
  let authorized = false;

  if (signToken) {
    const { data: signer } = await supabase
      .from("signers")
      .select("envelope_id, status")
      .eq("sign_token", signToken)
      .single();
    if (signer && signer.envelope_id === envelopeId && signer.status === "signed") {
      authorized = true;
    }
  }

  if (!authorized) {
    const authHeader = request.headers.get("authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const { data: userRes } = await supabase.auth.getUser(token);
      const userId = userRes?.user?.id;
      if (userId) {
        const { data: env_ } = await supabase
          .from("envelopes")
          .select("user_id")
          .eq("id", envelopeId)
          .single();
        if (env_ && env_.user_id === userId) authorized = true;
      }
    }
  }

  if (!authorized) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 403, headers: corsHeaders });
  }

  const { data: envelope } = await supabase
    .from("envelopes")
    .select("final_pdf_url")
    .eq("id", envelopeId)
    .single();

  if (!envelope) {
    return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: corsHeaders });
  }
  if (!envelope.final_pdf_url) {
    return new Response(JSON.stringify({ error: "not_ready", detail: "Final document is still being generated" }),
      { status: 425, headers: corsHeaders });
  }

  const { data: signed, error: signErr } = await supabase.storage
    .from("pdfs")
    .createSignedUrl(envelope.final_pdf_url, 86400);

  if (signErr || !signed) {
    return new Response(JSON.stringify({ error: "sign_url_failed" }), { status: 500, headers: corsHeaders });
  }

  // Content-type negotiation: dashboard fetch() asks for JSON; email-link
  // clicks land here with a browser Accept header (text/html,...) and want
  // a 302 to the signed URL so the PDF downloads directly.
  const accept = request.headers.get("Accept") || "";
  if (accept.includes("application/json")) {
    return new Response(JSON.stringify({ url: signed.signedUrl }), { status: 200, headers: corsHeaders });
  }
  return Response.redirect(signed.signedUrl, 302);
}
