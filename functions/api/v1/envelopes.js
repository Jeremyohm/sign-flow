import { authenticateRequest, hasScope, logUsage, dispatchWebhooks, corsHeaders, handleOptions } from "../_lib/auth.js";

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions();

  const auth = await authenticateRequest(request, env);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });

  const { user, supabase } = auth;
  const userId = user.user_id;
  const url = new URL(request.url);
  const envelopeId = url.searchParams.get("id");
  const appUrl = env.APP_URL || "https://signflow-phi.vercel.app";

  try {
    if (request.method === "GET") {
      if (!hasScope(user, "envelopes.read")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });

      if (envelopeId) {
        const { data: envelope, error } = await supabase
          .from("envelopes").select("*").eq("id", envelopeId).eq("user_id", userId).single();
        if (error || !envelope) return Response.json({ error: "Envelope not found" }, { status: 404, headers: corsHeaders() });

        const [{ data: signers }, { data: fields }] = await Promise.all([
          supabase.from("signers").select("id, name, email, role, status, sort_order, signed_at, sign_token, created_at")
            .eq("envelope_id", envelopeId).order("sort_order"),
          supabase.from("fields").select("*").eq("envelope_id", envelopeId),
        ]);

        await logUsage(supabase, userId, user.key_id, "/v1/envelopes/:id", "GET", 200);
        return Response.json({
          ...formatEnvelope(envelope),
          signers: (signers || []).map(s => formatSigner(s, appUrl)),
          fields: (fields || []).map(formatField),
        }, { headers: corsHeaders() });
      }

      const { status, limit = 50, offset = 0 } = Object.fromEntries(url.searchParams);
      let query = supabase.from("envelopes").select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(Number(offset), Number(offset) + Number(limit) - 1);

      if (status) query = query.eq("status", status);
      const { data, count, error } = await query;
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      await logUsage(supabase, userId, user.key_id, "/v1/envelopes", "GET", 200);
      return Response.json({ data: (data || []).map(formatEnvelope), total: count, limit: Number(limit), offset: Number(offset) }, { headers: corsHeaders() });
    }

    if (request.method === "POST") {
      if (!hasScope(user, "envelopes.write")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });

      if (user.plan !== "owner" && user.envelopes_used >= user.envelope_limit) {
        return Response.json({ error: `Envelope limit reached (${user.envelope_limit}/month). Upgrade your plan.` }, { status: 429, headers: corsHeaders() });
      }

      const body = await request.json();
      const { name, routing = "sequential", pages = 1, signers = [], template_id } = body;
      if (!name) return Response.json({ error: "name is required" }, { status: 400, headers: corsHeaders() });

      const { data: envelope, error } = await supabase
        .from("envelopes").insert({ user_id: userId, name, routing, pages }).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      let createdSigners = [];
      if (signers.length > 0) {
        const signerRows = signers.map((s, i) => ({
          envelope_id: envelope.id, name: s.name || "", email: s.email || "",
          role: s.role || "Signer", sort_order: i, status: "pending",
          sign_token: crypto.randomUUID(),
        }));
        const { data: sData } = await supabase.from("signers").insert(signerRows).select();
        createdSigners = (sData || []).map(s => formatSigner(s, appUrl));

        // Hash access codes server-side if provided
        for (let i = 0; i < signers.length; i++) {
          if (signers[i].access_code && sData[i]) {
            await supabase.rpc("set_access_code", {
              p_sign_token: sData[i].sign_token,
              p_code: signers[i].access_code,
            });
          }
        }
      }

      let createdFields = [];
      if (template_id && createdSigners.length > 0) {
        const { data: tmpl } = await supabase.from("templates").select("*").eq("id", template_id).eq("user_id", userId).single();
        if (tmpl && tmpl.fields) {
          const fieldRows = tmpl.fields.map(f => ({
            envelope_id: envelope.id,
            signer_id: createdSigners[f.signer || 0]?.id,
            type: f.type, page: f.page || 0, x: f.x, y: f.y, w: f.w, h: f.h,
          }));
          const { data: fData } = await supabase.from("fields").insert(fieldRows).select();
          createdFields = (fData || []).map(formatField);
        }
      }

      await supabase.from("subscriptions").update({ envelopes_used: user.envelopes_used + 1 }).eq("user_id", userId);
      await logUsage(supabase, userId, user.key_id, "/v1/envelopes", "POST", 201);
      await dispatchWebhooks(supabase, userId, "envelope.created", { envelope: formatEnvelope(envelope) });

      return Response.json({ ...formatEnvelope(envelope), signers: createdSigners, fields: createdFields }, { status: 201, headers: corsHeaders() });
    }

    if (request.method === "PUT") {
      if (!hasScope(user, "envelopes.write")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });
      if (!envelopeId) return Response.json({ error: "id query parameter required" }, { status: 400, headers: corsHeaders() });

      const body = await request.json();
      const updates = {};
      if (body.name) updates.name = body.name;
      if (body.status) updates.status = body.status;
      if (body.routing) updates.routing = body.routing;
      updates.updated_at = new Date().toISOString();

      const { data, error } = await supabase.from("envelopes").update(updates)
        .eq("id", envelopeId).eq("user_id", userId).select().single();
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      await logUsage(supabase, userId, user.key_id, "/v1/envelopes/:id", "PUT", 200);
      if (body.status === "sent") await dispatchWebhooks(supabase, userId, "envelope.sent", { envelope: formatEnvelope(data) });
      if (body.status === "completed") await dispatchWebhooks(supabase, userId, "envelope.completed", { envelope: formatEnvelope(data) });

      return Response.json(formatEnvelope(data), { headers: corsHeaders() });
    }

    if (request.method === "DELETE") {
      if (!hasScope(user, "envelopes.write")) return Response.json({ error: "Insufficient scope" }, { status: 403, headers: corsHeaders() });
      if (!envelopeId) return Response.json({ error: "id query parameter required" }, { status: 400, headers: corsHeaders() });

      const { error } = await supabase.from("envelopes").delete().eq("id", envelopeId).eq("user_id", userId);
      if (error) return Response.json({ error: error.message }, { status: 500, headers: corsHeaders() });

      await logUsage(supabase, userId, user.key_id, "/v1/envelopes/:id", "DELETE", 200);
      await dispatchWebhooks(supabase, userId, "envelope.deleted", { envelope_id: envelopeId });

      return Response.json({ deleted: true }, { headers: corsHeaders() });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
  } catch (err) {
    console.error("API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}

function formatEnvelope(e) {
  return { id: e.id, name: e.name, status: e.status, routing: e.routing, pages: e.pages, pdf_url: e.pdf_url, created_at: e.created_at, updated_at: e.updated_at };
}

function formatSigner(s, appUrl) {
  return { id: s.id, name: s.name, email: s.email, role: s.role, status: s.status, sort_order: s.sort_order, signed_at: s.signed_at, sign_token: s.sign_token, signing_url: `${appUrl}/sign/${s.sign_token}` };
}

function formatField(f) {
  return { id: f.id, type: f.type, page: f.page, signer_id: f.signer_id, x: Number(f.x), y: Number(f.y), w: Number(f.w), h: Number(f.h), value: f.value };
}
