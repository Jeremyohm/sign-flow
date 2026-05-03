import { authenticateRequest, hashApiKey, randomHex, corsHeaders, handleOptions } from "../_lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions();

  const auth = await authenticateRequest(request, env);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });

  const { user, supabase } = auth;
  const userId = user.user_id;
  const url = new URL(request.url);
  const keyId = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      const { data, error } = await supabase
        .from("api_keys").select("id, name, key_prefix, scopes, last_used_at, created_at, revoked_at")
        .eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
      return Response.json({ data: data || [] }, { headers: corsHeaders() });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const { name = "Default", scopes } = body || {};
      const defaultScopes = ["envelopes.read", "envelopes.write", "templates.read", "templates.write", "webhooks.manage"];
      const keyScopes = scopes || defaultScopes;

      const rawKey = "sf_live_" + randomHex(24);
      const keyHash = await hashApiKey(rawKey, env);
      const keyPrefix = rawKey.slice(0, 16) + "...";

      const { data, error } = await supabase
        .from("api_keys")
        .insert({ user_id: userId, name, key_hash: keyHash, key_prefix: keyPrefix, scopes: keyScopes })
        .select("id, name, key_prefix, scopes, created_at").single();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      return Response.json({ ...data, key: rawKey, warning: "Save this key now — it will not be shown again." }, { status: 201, headers: corsHeaders() });
    }

    if (request.method === "DELETE") {
      if (!keyId) return Response.json({ error: "id query parameter required" }, { status: 400, headers: corsHeaders() });
      const { error } = await supabase
        .from("api_keys").update({ revoked_at: new Date().toISOString() })
        .eq("id", keyId).eq("user_id", userId);
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
      return Response.json({ revoked: true }, { headers: corsHeaders() });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
  } catch (err) {
    console.error("Keys API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}
