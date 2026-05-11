import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import { generateCertificate } from "../_lib/cert-generator.js";
import { mergePdfFields } from "../_lib/pdf-merge.js";

const BATCH_SIZE = 5;
const MAX_ATTEMPTS = 3;
// Backoff per attempt: 1m, 10m, 1h
const BACKOFF_MINUTES = [1, 10, 60];

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CRON_SECRET || request.headers.get("x-cron-secret") !== env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
  );

  const { data: jobs, error: fetchError } = await supabase
    .from("pdf_generation_queue")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return Response.json({ error: "fetch_failed", detail: fetchError.message }, { status: 500 });
  }
  if (!jobs || jobs.length === 0) {
    return Response.json({ processed: 0 });
  }

  // PDF generation is heavy; process serially to avoid memory spikes.
  const results = [];
  for (const job of jobs) {
    const { data: locked, error: lockError } = await supabase
      .from("pdf_generation_queue")
      .update({ status: "processing" })
      .eq("id", job.id)
      .eq("status", "pending")
      .select("id");

    if (lockError || !locked || locked.length === 0) {
      results.push({ id: job.id, ok: false, reason: "lock_failed" });
      continue;
    }

    try {
      await processJob(supabase, job, env);
      await supabase.from("pdf_generation_queue")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
          attempt_count: job.attempt_count + 1,
        })
        .eq("id", job.id);
      results.push({ id: job.id, ok: true });
    } catch (err) {
      const newAttempts = job.attempt_count + 1;
      const isDead = newAttempts >= MAX_ATTEMPTS;
      const backoffIdx = Math.min(newAttempts - 1, BACKOFF_MINUTES.length - 1);
      const next = new Date(Date.now() + BACKOFF_MINUTES[backoffIdx] * 60 * 1000);

      await supabase.from("pdf_generation_queue")
        .update({
          status: isDead ? "failed" : "pending",
          attempt_count: newAttempts,
          next_attempt_at: next.toISOString(),
          last_error: String(err).slice(0, 1000),
        })
        .eq("id", job.id);
      results.push({ id: job.id, ok: false, reason: String(err) });
    }
  }

  return Response.json({
    processed: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  });
}

async function processJob(supabase, job, env) {
  const { data: envData, error: rpcError } = await supabase.rpc("get_envelope_for_certificate", {
    p_envelope_id: job.envelope_id,
  });
  if (rpcError) throw new Error(`RPC failed: ${rpcError.message}`);
  if (!envData || !envData.envelope) throw new Error("Envelope data missing");

  // pdf_url is stored as a path-relative-to-bucket via db.uploadPdf.
  const pdfPath = envData.envelope.pdf_url;
  if (!pdfPath) throw new Error("Envelope has no pdf_url");

  const { data: pdfBlob, error: dlError } = await supabase.storage.from("pdfs").download(pdfPath);
  if (dlError) throw new Error(`PDF download failed: ${dlError.message}`);
  const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

  // Backfill original hash if Migration 2 left it unset.
  let originalHash = envData.envelope.original_pdf_sha256;
  if (!originalHash) {
    originalHash = await sha256Hex(pdfBytes);
    await supabase.from("envelopes")
      .update({ original_pdf_sha256: originalHash })
      .eq("id", job.envelope_id);
    envData.envelope.original_pdf_sha256 = originalHash;
  }

  // Pull stored field values; mergePdfFields treats them as text (signature-image
  // rendering is a known follow-up — see migration plan).
  const { data: fields, error: fieldsErr } = await supabase
    .from("fields")
    .select("page,x,y,w,h,value,type,signer_id")
    .eq("envelope_id", job.envelope_id);
  if (fieldsErr) throw new Error(`Fields fetch failed: ${fieldsErr.message}`);

  const signerById = new Map((envData.signers || []).map(s => [s.id, s]));
  const fieldValues = (fields || []).filter(f => f.value != null).map(f => {
    const signer = signerById.get(f.signer_id);
    return {
      page: f.page, x: f.x, y: f.y, w: f.w, h: f.h, value: f.value,
      type: f.type,
      signer_name: signer?.name || signer?.email || "",
      signed_at: signer?.signed_at || null,
    };
  });

  const signedPdfBytes = fieldValues.length > 0
    ? await mergePdfFields(pdfBytes, fieldValues)
    : pdfBytes;

  // Hash the signed document BEFORE generating/appending the cert so the cert
  // can display this hash. The combined (signed+cert) hash would be self-
  // referential; verifiers strip trailing cert pages and re-hash to check.
  const signedHash = await sha256Hex(signedPdfBytes);
  envData.envelope.final_pdf_sha256 = signedHash;

  // Look up the owner's plan so the cert can render the "Powered by Sign Flow"
  // footer only on free-tier envelopes.
  const { data: planRow } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", envData.envelope.user_id)
    .maybeSingle();
  const showBranding = (planRow?.plan || "free") === "free";

  const certPdf = await generateCertificate(envData, { showBranding });
  const certBytes = await certPdf.save();

  // Append cert to signed document
  const finalPdf = await PDFDocument.load(signedPdfBytes);
  const certForMerge = await PDFDocument.load(certBytes);
  const certPages = await finalPdf.copyPages(certForMerge, certForMerge.getPageIndices());
  certPages.forEach(p => finalPdf.addPage(p));
  const finalBytes = await finalPdf.save();

  const ownerId = envData.owner?.id;
  if (!ownerId) throw new Error("Owner id missing");
  const certPath = `${ownerId}/certificates/${job.envelope_id}.pdf`;
  const finalPath = `${ownerId}/finals/${job.envelope_id}.pdf`;

  const { error: certUpErr } = await supabase.storage.from("pdfs")
    .upload(certPath, certBytes, { contentType: "application/pdf", upsert: true });
  if (certUpErr) throw new Error(`Cert upload failed: ${certUpErr.message}`);

  const { error: finalUpErr } = await supabase.storage.from("pdfs")
    .upload(finalPath, finalBytes, { contentType: "application/pdf", upsert: true });
  if (finalUpErr) throw new Error(`Final upload failed: ${finalUpErr.message}`);

  await supabase.from("envelopes")
    .update({
      final_pdf_sha256: signedHash,
      final_pdf_url: finalPath,
      certificate_pdf_url: certPath,
    })
    .eq("id", job.envelope_id);

  // RPC omits sign_token; fetch per-signer tokens for signed-only download links.
  const { data: tokenRows } = await supabase
    .from("signers")
    .select("id, sign_token")
    .eq("envelope_id", job.envelope_id);
  const tokenById = new Map((tokenRows || []).map(r => [r.id, r.sign_token]));

  // Queue completion emails. Signers get a sign_token-gated download link;
  // owner gets a dashboard pointer that takes them to /envelope/:id (where
  // they sign in and download). Hard-code the prod URL as fallback so this
  // doesn't silently produce empty/relative links if APP_URL is unset.
  const appUrl = env.APP_URL || "https://sign-flow.net";
  const completionRows = [];
  for (const signer of (envData.signers || [])) {
    const signerSignToken = tokenById.get(signer.id) || null;
    completionRows.push({
      envelope_id: job.envelope_id,
      signer_id: signer.id,
      to_email: signer.email,
      to_name: signer.name || "",
      subject: `Completed: ${envData.envelope.name}`,
      email_type: "completed",
      template_data: {
        envelope_name: envData.envelope.name,
        signer_name: signer.name || "",
        sign_token: signerSignToken,
        download_url: signerSignToken
          ? `${appUrl}/api/download-signed-document?envelope_id=${job.envelope_id}&sign_token=${signerSignToken}`
          : "",
      },
    });
  }
  if (envData.owner?.email) {
    completionRows.push({
      envelope_id: job.envelope_id,
      to_email: envData.owner.email,
      to_name: "",
      subject: `Completed: ${envData.envelope.name}`,
      email_type: "completed",
      template_data: {
        envelope_name: envData.envelope.name,
        download_url: appUrl ? `${appUrl}/envelope/${job.envelope_id}` : "",
      },
    });
  }
  if (completionRows.length > 0) {
    await supabase.from("email_outbox").insert(completionRows);
  }
}

async function sha256Hex(bytes) {
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}
