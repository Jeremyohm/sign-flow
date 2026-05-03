import { getSupabase, corsHeaders, handleOptions } from "../_lib/auth.js";
import { mergePdfFields, addKeyItemsTable } from "../_lib/pdf-merge.js";

/**
 * SF Webhook Endpoint — purpose-built for Salesforce Flow callouts.
 * POST /api/v1/sf-webhook
 * Auth: X-API-Key header (shared secret, not user-scoped)
 *
 * Creates an envelope from a template, merges PDF fields + key items table,
 * sends for signing, and returns signer URLs.
 */
export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions();
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
  }

  // API key auth (simple shared secret for SF → Legacy Sign)
  const apiKey = request.headers.get("X-API-Key") || request.headers.get("x-api-key");
  if (!apiKey || apiKey !== env.SF_WEBHOOK_API_KEY) {
    return Response.json({ error: "Invalid or missing API key" }, { status: 401, headers: corsHeaders() });
  }

  const supabase = getSupabase(env);
  const appUrl = env.APP_URL || "https://tlh-legacy-sign.pages.dev";

  try {
    const body = await request.json();
    const {
      template_id,
      sf_opportunity_id,
      opportunity_name,
      field_values = [],       // [{ page, x, y, w, h, value }]
      key_items = [],           // ["Item Name $Value", ...] or [{ name, value }]
      key_items_page,           // page index for key items table (default: last page)
      signers = [],             // [{ name, email, role, access_code }]
      callback_url,             // SF endpoint to call on completion
      envelope_name,            // override envelope name
    } = body;

    if (!template_id) {
      return Response.json({ error: "template_id is required" }, { status: 400, headers: corsHeaders() });
    }
    if (!signers.length) {
      return Response.json({ error: "At least one signer is required" }, { status: 400, headers: corsHeaders() });
    }

    // Load template
    const { data: template, error: tmplErr } = await supabase
      .from("templates").select("*").eq("id", template_id).single();
    if (tmplErr || !template) {
      return Response.json({ error: "Template not found" }, { status: 404, headers: corsHeaders() });
    }

    // Download template PDF from storage
    let pdfBytes = null;
    if (template.pdf_url) {
      const { data: signedUrlData } = await supabase.storage
        .from("pdfs").createSignedUrl(template.pdf_url, 300);
      if (signedUrlData?.signedUrl) {
        const pdfResp = await fetch(signedUrlData.signedUrl);
        pdfBytes = new Uint8Array(await pdfResp.arrayBuffer());
      }
    }

    // Merge PDF fields if we have a PDF and field values
    if (pdfBytes && field_values.length > 0) {
      pdfBytes = await mergePdfFields(pdfBytes, field_values);
    }

    // Parse key items strings into objects if needed: "Item Name $Value" → { name, value }
    const parsedItems = key_items.map(item => {
      if (typeof item === "object" && item.name) return item;
      const str = String(item);
      const match = str.match(/^(.+?)\s+\$(.+)$/);
      if (match) return { name: match[1].trim(), value: `$${match[2].trim()}` };
      return { name: str, value: "" };
    });

    // Add key items table to PDF
    if (pdfBytes && parsedItems.length > 0) {
      const pageIdx = key_items_page ?? (template.pages ? template.pages - 1 : 0);
      pdfBytes = await addKeyItemsTable(pdfBytes, pageIdx, parsedItems);
    }

    // Upload merged PDF to storage
    let mergedPdfUrl = template.pdf_url;
    if (pdfBytes) {
      const path = `sf-envelopes/${sf_opportunity_id || crypto.randomUUID()}.pdf`;
      await supabase.storage.from("pdfs").upload(path, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });
      mergedPdfUrl = path;
    }

    // Create envelope
    const envName = envelope_name || opportunity_name || template.name;
    const metadata = {};
    if (sf_opportunity_id) metadata.sf_opportunity_id = sf_opportunity_id;
    if (callback_url) metadata.callback_url = callback_url;

    const { data: envelope, error: envErr } = await supabase
      .from("envelopes").insert({
        user_id: template.user_id,
        name: envName,
        routing: "sequential",
        pages: template.pages || 1,
        pdf_url: mergedPdfUrl,
        status: "sent",
        metadata,
      }).select().single();

    if (envErr) {
      return Response.json({ error: envErr.message }, { status: 500, headers: corsHeaders() });
    }

    // Create signers with sequential statuses
    const signerRows = signers.map((s, i) => {
      const role = (s.role || "Signer").toLowerCase();
      const isCC = role === "cc";
      return {
        envelope_id: envelope.id,
        name: s.name || "",
        email: s.email || "",
        role: isCC ? "CC" : "Signer",
        sort_order: i,
        status: isCC ? "signed" : (i === 0 ? "pending" : "waiting"),
        sign_token: crypto.randomUUID(),
        access_code: s.access_code || null,
        signed_at: isCC ? new Date().toISOString() : null,
      };
    });

    // For sequential: find first non-CC signer and set to pending
    const firstSignerIdx = signerRows.findIndex(s => s.role !== "CC");
    signerRows.forEach((s, i) => {
      if (s.role === "CC") return; // already set
      s.status = i === firstSignerIdx ? "pending" : "waiting";
    });

    const { data: createdSigners, error: sigErr } = await supabase
      .from("signers").insert(signerRows).select();

    if (sigErr) {
      return Response.json({ error: sigErr.message }, { status: 500, headers: corsHeaders() });
    }

    // Create fields from template
    if (template.fields && template.fields.length > 0) {
      const fieldRows = template.fields.map(f => ({
        envelope_id: envelope.id,
        signer_index: f.signer || 0,
        type: f.type,
        page: f.page || 0,
        x: f.x, y: f.y, w: f.w, h: f.h,
      }));
      await supabase.from("fields").insert(fieldRows);
    }

    // Build response with signing URLs
    const signerResponse = createdSigners.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      role: s.role,
      status: s.status,
      signing_url: s.role === "CC" ? null : `${appUrl}/sign/${s.sign_token}`,
    }));

    return Response.json({
      envelope_id: envelope.id,
      status: "sent",
      signers: signerResponse,
    }, { status: 201, headers: corsHeaders() });

  } catch (err) {
    console.error("SF webhook error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}
