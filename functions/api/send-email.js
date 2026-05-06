import { getSupabase } from "./_lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({ error: "invalid_body" }, { status: 400 });

  const { envelopeId, signerId, signToken, to, toName, subject, signingUrl, envelopeName, type, hasAccessCode } = body;

  if (!to || !subject) {
    return Response.json({ error: "Missing required fields: to, subject" }, { status: 400 });
  }

  const supabase = getSupabase(env);

  const emailType = type === "request" ? "signing_request"
    : type === "reminder" ? "reminder"
    : type === "completed" ? "completed"
    : type === "declined" ? "declined"
    : "signing_request";

  const { error } = await supabase.from("email_outbox").insert({
    envelope_id: envelopeId || null,
    signer_id: signerId || null,
    to_email: to,
    to_name: toName || "",
    subject,
    email_type: emailType,
    template_data: {
      envelope_name: envelopeName || "",
      signer_name: toName || "",
      signing_url: signingUrl || "",
      sign_token: signToken || "",
      has_access_code: !!hasAccessCode,
    },
  });

  if (error) {
    console.error("Failed to enqueue email", error);
    return Response.json({ error: "queue_failed", detail: error.message }, { status: 500 });
  }

  return Response.json({ queued: true });
}
