import { supabase } from "./supabase";

// ── Envelopes ──

export async function fetchEnvelopes() {
  const { data, error } = await supabase
    .from("envelopes")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchEnvelopeWithDetails(id) {
  const [envRes, signersRes, fieldsRes] = await Promise.all([
    supabase.from("envelopes").select("*").eq("id", id).single(),
    supabase.from("signers").select("*").eq("envelope_id", id).order("sort_order"),
    supabase.from("fields").select("*").eq("envelope_id", id),
  ]);
  if (envRes.error) throw envRes.error;
  return {
    ...envRes.data,
    signers: signersRes.data || [],
    fields: fieldsRes.data || [],
  };
}

export async function createEnvelope(userId, { name, pages, routing, pdfUrl, templateFields }) {
  const { data: env, error } = await supabase
    .from("envelopes")
    .insert({ user_id: userId, name, pages, routing: routing || "sequential", pdf_url: pdfUrl || null })
    .select()
    .single();
  if (error) throw error;
  return env;
}

export async function updateEnvelope(id, updates) {
  const { data, error } = await supabase
    .from("envelopes")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEnvelope(id) {
  const { error } = await supabase.from("envelopes").delete().eq("id", id);
  if (error) throw error;
}

// ── Signers ──

export async function createSigners(envelopeId, signers) {
  const rows = signers.map((s, i) => ({
    envelope_id: envelopeId,
    name: s.name || "",
    email: s.email || "",
    role: s.role || "Signer",
    status: s.status || "pending",
    sort_order: i,
    sign_token: crypto.randomUUID(),
  }));
  const { data, error } = await supabase.from("signers").insert(rows).select();
  if (error) throw error;

  // Hash access codes server-side via RPC if any signer has one
  for (let i = 0; i < signers.length; i++) {
    const code = signers[i].accessCode || signers[i].access_code;
    if (code && data[i]) {
      await setAccessCode(data[i].sign_token, code);
    }
  }

  return data;
}

export async function setAccessCode(signToken, code) {
  const { data, error } = await supabase.rpc("set_access_code", {
    p_sign_token: signToken,
    p_code: code,
  });
  if (error) throw error;
  return data;
}

export async function updateSigner(id, updates) {
  const { data, error } = await supabase
    .from("signers")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteSignersByEnvelope(envelopeId) {
  const { error } = await supabase.from("signers").delete().eq("envelope_id", envelopeId);
  if (error) throw error;
}

// ── Fields ──

export async function createFields(envelopeId, fields) {
  const rows = fields.map(f => ({
    envelope_id: envelopeId,
    signer_id: f.signer_id,
    type: f.type,
    page: f.page,
    x: f.x,
    y: f.y,
    w: f.w,
    h: f.h,
    value: f.value || null,
  }));
  const { data, error } = await supabase.from("fields").insert(rows).select();
  if (error) throw error;
  return data;
}

export async function updateField(id, updates) {
  const { data, error } = await supabase
    .from("fields")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFieldsByEnvelope(envelopeId) {
  const { error } = await supabase.from("fields").delete().eq("envelope_id", envelopeId);
  if (error) throw error;
}

// ── Templates ──

export async function fetchTemplates(userId) {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createTemplate(userId, template) {
  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: userId,
      name: template.name,
      description: template.description || "",
      pages: template.pages,
      signer_roles: template.signerRoles || [],
      fields: template.fields || [],
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw error;
}

// ── Emails ──

export async function fetchEmails(userId) {
  const { data, error } = await supabase
    .from("emails")
    .select("*")
    .eq("user_id", userId)
    .order("sent_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createEmail(userId, email) {
  const { data, error } = await supabase
    .from("emails")
    .insert({
      user_id: userId,
      envelope_id: email.envelopeId,
      to_email: email.to,
      to_name: email.toName || "",
      type: email.type || "request",
      subject: email.subject,
      signing_url: email.signingUrl || null,
      status: "sending",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEmail(id, updates) {
  const { data, error } = await supabase
    .from("emails")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Signing (public, token-based) ──

export async function getEnvelopeForSigning(signToken) {
  const { data, error } = await supabase.rpc("get_envelope_for_signing", {
    sign_token_param: signToken,
  });
  if (error) throw error;
  return data;
}

export async function verifyAccessCode(signToken, code) {
  const res = await fetch("/api/sign-verify-access-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign_token: signToken, code }),
  });
  if (!res.ok) throw new Error("Access code verification failed");
  return await res.json();
}

// ── Signing endpoints (routed through server for IP/UA capture) ──

export async function submitSignedFields(signToken, fieldValues) {
  const res = await fetch("/api/sign-submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign_token: signToken, field_values: fieldValues }),
  });
  if (!res.ok) throw new Error("Signing submission failed");
  return await res.json();
}

export async function declineEnvelope(signToken, reason) {
  const res = await fetch("/api/sign-decline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign_token: signToken, reason: reason || "No reason provided" }),
  });
  if (!res.ok) throw new Error("Decline failed");
  return await res.json();
}

export async function recordSignerView(signToken) {
  fetch("/api/sign-record-view", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign_token: signToken }),
  }).catch(err => console.error("Failed to record view", err));
}

export async function recordConsent(signToken, disclosureVersion) {
  const res = await fetch("/api/sign-record-consent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign_token: signToken, disclosure_version: disclosureVersion }),
  });
  if (!res.ok) throw new Error("Consent recording failed");
  return await res.json();
}

export async function getSignedPdfUrlForSigning(signToken) {
  const res = await fetch("/api/sign-pdf-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sign_token: signToken }),
  });
  if (!res.ok) throw new Error("Failed to get PDF URL");
  const { url } = await res.json();
  return url;
}

// ── PDF Storage ──

export async function uploadPdf(userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.pdf`;
  const { error } = await supabase.storage.from("pdfs").upload(path, file);
  if (error) throw error;
  return path;
}

export async function getPdfUrl(path) {
  const { data } = supabase.storage.from("pdfs").getPublicUrl(path);
  return data.publicUrl;
}

export async function getSignedPdfUrl(path) {
  const { data, error } = await supabase.storage.from("pdfs").createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}
