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

export async function createEnvelope(userId, { name, pages, routing, pdfUrl, original_pdf_sha256, expires_at, templateFields }) {
  const insertRow = {
    user_id: userId,
    name,
    pages,
    routing: routing || "sequential",
    pdf_url: pdfUrl || null,
    original_pdf_sha256: original_pdf_sha256 || null,
  };
  if (expires_at) insertRow.expires_at = expires_at;

  const { data: env, error } = await supabase
    .from("envelopes")
    .insert(insertRow)
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
    recipient_type: s.recipient_type === "cc" ? "cc" : "signer",
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

export async function createField(envelopeId, field) {
  const { data, error } = await supabase
    .from("fields")
    .insert({
      envelope_id: envelopeId,
      signer_id: field.signer_id || null,
      type: field.type,
      page: field.page,
      x: field.x, y: field.y, w: field.w, h: field.h,
      value: field.value || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteField(id) {
  const { error } = await supabase.from("fields").delete().eq("id", id);
  if (error) throw error;
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
  const row = {
    user_id: userId,
    name: template.name,
    description: template.description || "",
    pages: template.pages,
    signer_roles: template.signerRoles || template.signer_roles || [],
    fields: template.fields || [],
  };
  if (template.pdf_url) row.pdf_url = template.pdf_url;
  if (template.original_pdf_sha256) row.original_pdf_sha256 = template.original_pdf_sha256;
  const { data, error } = await supabase
    .from("templates")
    .insert(row)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplate(id, updates) {
  const { data, error } = await supabase
    .from("templates")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw error;
}

// Increment usage_count + stamp last_used_at when a template is consumed.
export async function recordTemplateUse(id, currentUsageCount = 0) {
  const { data, error } = await supabase
    .from("templates")
    .update({
      usage_count: (currentUsageCount || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Copy a stored PDF object within the pdfs bucket (used when saving a template
// from an existing envelope — template gets its own copy so deleting the
// envelope doesn't strand the template).
export async function copyPdfForTemplate(sourcePath, userId) {
  const targetPath = `${userId}/templates/${crypto.randomUUID()}.pdf`;

  const sessionRes = await supabase.auth.getSession();
  const userRes = await supabase.auth.getUser();
  console.log("[saveTemplate.copy] diagnostic", {
    bundleStamp: "TPL-DIAG-1",
    sourcePath,
    targetPath,
    userIdArg: userId,
    jwtUserId: userRes.data.user?.id ?? null,
    sessionPresent: !!sessionRes.data.session,
    idsMatch: (userRes.data.user?.id ?? null) === userId,
  });

  const { error } = await supabase.storage.from("pdfs").copy(sourcePath, targetPath);
  if (error) {
    console.error("[saveTemplate.copy] failed", {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      raw: error,
    });
    throw error;
  }
  return targetPath;
}

// ── Contacts ──

export async function fetchContacts() {
  const { data, error } = await supabase.rpc("get_contacts_for_user");
  if (error) throw error;
  return data || [];
}

export async function fetchContactDetail(contactId) {
  // RPC now returns one row per envelope, with contact metadata duplicated
  // on every row. Zero envelopes → zero rows; fall back to a direct contacts
  // fetch so we can still render the contact's header and an empty list.
  const { data: rows, error } = await supabase.rpc("get_contact_detail", { p_contact_id: contactId });
  if (error) throw error;
  const list = rows || [];
  if (list.length > 0) {
    const first = list[0];
    return {
      id: first.contact_id,
      email: first.email,
      display_name: first.display_name,
      is_hidden: first.is_hidden,
      envelopes: list.map(r => ({
        envelope_id: r.envelope_id,
        envelope_name: r.envelope_name,
        envelope_status: r.envelope_status,
        envelope_created_at: r.envelope_created_at,
        envelope_updated_at: r.envelope_updated_at,
        signer_status: r.signer_status,
      })),
    };
  }
  // Zero envelopes: fetch the contact row directly (RLS gates this anyway).
  const { data: contact, error: cErr } = await supabase
    .from("contacts").select("id, email, display_name, is_hidden")
    .eq("id", contactId).single();
  if (cErr) {
    if (cErr.code === "PGRST116") return null;
    throw cErr;
  }
  return { ...contact, envelopes: [] };
}

export async function updateContact(contactId, patch) {
  const { data, error } = await supabase.from("contacts")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", contactId).select().single();
  if (error) throw error;
  return data;
}

export async function hideContact(contactId) {
  return updateContact(contactId, { is_hidden: true });
}

// ── Reports ──

export async function fetchReports(rangeDays) {
  const { data, error } = await supabase.rpc("get_reports_for_user", {
    p_range_days: rangeDays ?? null,
  });
  if (error) throw error;
  return data;
}

// ── Notifications ──

export async function fetchNotifications({ onlyUnread = false, limit = 50 } = {}) {
  const { data, error } = await supabase.rpc("get_notifications_for_user", {
    p_only_unread: onlyUnread, p_limit: limit,
  });
  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount() {
  const { data, error } = await supabase.rpc("get_unread_notification_count");
  if (error) throw error;
  return data || 0;
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function markAllNotificationsRead() {
  const { data, error } = await supabase.rpc("mark_all_notifications_read");
  if (error) throw error;
  return data;
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

// Browser-computed SHA-256. The cron worker recomputes from the stored bytes
// before writing the certificate, so this is a fast-path hint, not a security claim.
async function sha256HexFromFile(file) {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function uploadPdf(userId, file) {
  const path = `${userId}/${crypto.randomUUID()}.pdf`;
  const sha256 = await sha256HexFromFile(file);
  const { error } = await supabase.storage.from("pdfs").upload(path, file);
  if (error) throw error;
  return { path, sha256 };
}

// Upload a PDF directly into the template-owned namespace (used by standalone
// template creation; envelope-derived templates use copyPdfForTemplate instead).
export async function uploadPdfForTemplate(userId, file) {
  const path = `${userId}/templates/${crypto.randomUUID()}.pdf`;

  const sessionRes = await supabase.auth.getSession();
  const userRes = await supabase.auth.getUser();
  console.log("[saveTemplate.upload] diagnostic", {
    bundleStamp: "TPL-DIAG-1",
    path,
    userIdArg: userId,
    jwtUserId: userRes.data.user?.id ?? null,
    sessionPresent: !!sessionRes.data.session,
    idsMatch: (userRes.data.user?.id ?? null) === userId,
  });

  const sha256 = await sha256HexFromFile(file);
  const { error } = await supabase.storage.from("pdfs").upload(path, file);
  if (error) {
    console.error("[saveTemplate.upload] failed", {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      raw: error,
    });
    throw error;
  }
  return { path, sha256 };
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

// ── Final document & certificate download ──

async function fetchDownloadUrl(endpoint, envelopeId, signToken) {
  const params = new URLSearchParams({ envelope_id: envelopeId });
  if (signToken) params.set("sign_token", signToken);

  const headers = {};
  if (!signToken) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  }

  const res = await fetch(`${endpoint}?${params}`, { headers });
  if (res.status === 425) {
    const err = new Error("not_ready");
    err.status = 425;
    throw err;
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const { url } = await res.json();
  return url;
}

export async function fetchSignedDocumentUrl(envelopeId, signToken) {
  return fetchDownloadUrl("/api/download-signed-document", envelopeId, signToken);
}

export async function fetchCertificateUrl(envelopeId, signToken) {
  return fetchDownloadUrl("/api/download-certificate", envelopeId, signToken);
}
