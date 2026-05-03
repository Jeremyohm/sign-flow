import { authenticateRequest, hasScope, logUsage, randomHex, corsHeaders, handleOptions } from "../_lib/auth.js";

const VALID_EVENTS = [
  "envelope.created", "envelope.sent", "envelope.completed", "envelope.deleted",
  "signer.signed", "signer.declined",
];

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions();

  const auth = await authenticateRequest(request, env);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });

  const { user, supabase } = auth;
  const userId = user.user_id;
  const url = new URL(request.url);
  const webhookId = url.searchParams.get("id");

  if (!hasScope(user, "webhooks.manage")) return Response.json({ error: "Insufficient scope: webhooks.manage required" }, { status: 403, headers: corsHeaders() });

  try {
    if (request.method === "GET") {
      if (webhookId) {
        const { data, error } = await supabase
          .from("webhooks").select("*").eq("id", webhookId).eq("user_id", userId).single();
        if (error || !data) return Response.json({ error: "Webhook not found" }, { status: 404, headers: corsHeaders() });

        const { data: deliveries } = await supabase
          .from("webhook_deliveries").select("*").eq("webhook_id", webhookId)
          .order("delivered_at", { ascending: false }).limit(20);

        return Response.json({ ...formatWebhook(data), recent_deliveries: deliveries || [] }, { headers: corsHeaders() });
      }

      const { data, error } = await supabase
        .from("webhooks").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
      return Response.json({ data: (data || []).map(formatWebhook) }, { headers: corsHeaders() });
    }

    if (request.method === "POST") {
      const body = await request.json();
      const { url: hookUrl, events = VALID_EVENTS } = body || {};
      if (!hookUrl) return Response.json({ error: "url is required" }, { status: 400, headers: corsHeaders() });

      const invalidEvents = events.filter(e => !VALID_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return Response.json({ error: `Invalid events: ${invalidEvents.join(", ")}. Valid: ${VALID_EVENTS.join(", ")}` }, { status: 400, headers: corsHeaders() });
      }

      const secret = "whsec_" + randomHex(24);
      const { data, error } = await supabase
        .from("webhooks").insert({ user_id: userId, url: hookUrl, events, secret }).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      await logUsage(supabase, userId, user.key_id, "/v1/webhooks", "POST", 201);
      return Response.json({ ...formatWebhook(data), secret }, { status: 201, headers: corsHeaders() });
    }

    if (request.method === "PUT") {
      if (!webhookId) return Response.json({ error: "id query parameter required" }, { status: 400, headers: corsHeaders() });

      const body = await request.json();
      const updates = {};
      if (body.url) updates.url = body.url;
      if (body.events) {
        const invalid = body.events.filter(e => !VALID_EVENTS.includes(e));
        if (invalid.length > 0) return Response.json({ error: `Invalid events: ${invalid.join(", ")}` }, { status: 400, headers: corsHeaders() });
        updates.events = body.events;
      }
      if (typeof body.active === "boolean") updates.active = body.active;

      const { data, error } = await supabase
        .from("webhooks").update(updates).eq("id", webhookId).eq("user_id", userId).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      return Response.json(formatWebhook(data), { headers: corsHeaders() });
    }

    if (request.method === "DELETE") {
      if (!webhookId) return Response.json({ error: "id query parameter required" }, { status: 400, headers: corsHeaders() });
      const { error } = await supabase.from("webhooks").delete().eq("id", webhookId).eq("user_id", userId);
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
      return Response.json({ deleted: true }, { headers: corsHeaders() });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
  } catch (err) {
    console.error("Webhooks API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}

function formatWebhook(w) {
  return { id: w.id, url: w.url, events: w.events, active: w.active, failure_count: w.failure_count, last_triggered_at: w.last_triggered_at, created_at: w.created_at };
}
