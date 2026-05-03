import { authenticateRequest, hasScope, logUsage, corsHeaders, handleOptions } from "../_lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions();

  const auth = await authenticateRequest(request, env);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });

  const { user, supabase } = auth;
  const userId = user.user_id;
  const url = new URL(request.url);
  const templateId = url.searchParams.get("id");

  try {
    if (request.method === "GET") {
      if (!hasScope(user, "templates.read")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });

      if (templateId) {
        const { data, error } = await supabase
          .from("templates").select("*").eq("id", templateId).eq("user_id", userId).single();
        if (error || !data) return Response.json({ error: "Template not found" }, { status: 404, headers: corsHeaders() });
        await logUsage(supabase, userId, user.key_id, "/v1/templates/:id", "GET", 200);
        return Response.json(formatTemplate(data), { headers: corsHeaders() });
      }

      const { data, error } = await supabase
        .from("templates").select("*").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });
      await logUsage(supabase, userId, user.key_id, "/v1/templates", "GET", 200);
      return Response.json({ data: (data || []).map(formatTemplate) }, { headers: corsHeaders() });
    }

    if (request.method === "POST") {
      if (!hasScope(user, "templates.write")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });

      const body = await request.json();
      const { name, description = "", pages = 1, signer_roles = [], fields = [] } = body || {};
      if (!name) return Response.json({ error: "name is required" }, { status: 400, headers: corsHeaders() });

      const { data, error } = await supabase
        .from("templates").insert({ user_id: userId, name, description, pages, signer_roles, fields }).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      await logUsage(supabase, userId, user.key_id, "/v1/templates", "POST", 201);
      return Response.json(formatTemplate(data), { status: 201, headers: corsHeaders() });
    }

    if (request.method === "DELETE") {
      if (!hasScope(user, "templates.write")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });
      if (!templateId) return Response.json({ error: "id query parameter required" }, { status: 400, headers: corsHeaders() });

      const { error } = await supabase.from("templates").delete().eq("id", templateId).eq("user_id", userId);
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      await logUsage(supabase, userId, user.key_id, "/v1/templates/:id", "DELETE", 200);
      return Response.json({ deleted: true }, { headers: corsHeaders() });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
  } catch (err) {
    console.error("Templates API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}

function formatTemplate(t) {
  return { id: t.id, name: t.name, description: t.description, pages: t.pages, signer_roles: t.signer_roles, fields: t.fields, usage_count: t.usage_count, created_at: t.created_at };
}
