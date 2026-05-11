import { authenticateRequest, corsHeaders, handleOptions } from "../_lib/auth.js";

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await authenticateRequest(request, env);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });
  }
  const { user, supabase } = auth;
  const userId = user.user_id;

  // Tear down via auth admin; user_id FK cascades drop rows in envelopes,
  // signers, fields, templates, contacts, notifications, subscriptions, etc.
  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) {
    console.error("Account delete failed:", error);
    return Response.json({ error: "Failed to delete account" },
      { status: 500, headers: corsHeaders() });
  }
  return Response.json({ ok: true }, { headers: corsHeaders() });
}
