import { createClient } from "@supabase/supabase-js";

const POSTMARK_API_URL = "https://api.postmarkapp.com/email";
const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 5;

// Backoff schedule in minutes per attempt: 1m, 5m, 30m, 2h, 12h
const BACKOFF_MINUTES = [1, 5, 30, 120, 720];

export async function onRequestPost(context) {
  const { request, env } = context;

  // Auth: Cloudflare Cron Trigger sends x-cron-secret. Reject any other caller.
  const authHeader = request.headers.get("x-cron-secret");
  if (!env.CRON_SECRET || authHeader !== env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
  );

  const { data: emails, error: fetchError } = await supabase
    .from("email_outbox")
    .select("*")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return Response.json({ error: "fetch_failed", detail: fetchError.message }, { status: 500 });
  }

  if (!emails || emails.length === 0) {
    return Response.json({ processed: 0 });
  }

  const appBaseUrl = env.APP_URL || "";
  const postmarkToken = env.POSTMARK_API_TOKEN;
  const postmarkFrom = env.POSTMARK_FROM_EMAIL;

  const results = await Promise.all(emails.map(async (email) => {
    // Optimistic lock: only flip pending → sending if still pending.
    const { data: locked, error: lockError } = await supabase
      .from("email_outbox")
      .update({ status: "sending" })
      .eq("id", email.id)
      .eq("status", "pending")
      .select("id");

    if (lockError || !locked || locked.length === 0) {
      return { id: email.id, ok: false, reason: "lock_failed" };
    }

    try {
      if (!postmarkToken || !postmarkFrom) {
        throw new Error("postmark_not_configured");
      }
      const tmpl = buildEmailBody(email, appBaseUrl);
      const res = await fetch(POSTMARK_API_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Postmark-Server-Token": postmarkToken,
        },
        body: JSON.stringify({
          From: postmarkFrom,
          To: email.to_email,
          Subject: email.subject,
          HtmlBody: tmpl.html,
          TextBody: tmpl.text,
          MessageStream: "outbound",
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Postmark ${res.status}: ${errText.slice(0, 200)}`);
      }

      const result = await res.json();
      await supabase.from("email_outbox")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          postmark_message_id: result.MessageID,
          attempt_count: email.attempt_count + 1,
        })
        .eq("id", email.id);

      return { id: email.id, ok: true };
    } catch (err) {
      const newAttemptCount = email.attempt_count + 1;
      const isDead = newAttemptCount >= MAX_ATTEMPTS;
      const backoffIdx = Math.min(newAttemptCount - 1, BACKOFF_MINUTES.length - 1);
      const nextAttempt = new Date(Date.now() + BACKOFF_MINUTES[backoffIdx] * 60 * 1000);

      await supabase.from("email_outbox")
        .update({
          status: isDead ? "failed" : "pending",
          attempt_count: newAttemptCount,
          next_attempt_at: nextAttempt.toISOString(),
          last_error: String(err).slice(0, 1000),
        })
        .eq("id", email.id);

      return { id: email.id, ok: false, reason: String(err) };
    }
  }));

  return Response.json({
    processed: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  });
}

function buildEmailBody(email, appBaseUrl) {
  const data = email.template_data || {};
  const name = data.signer_name || email.to_name || "there";
  const envelopeName = data.envelope_name || "";
  const signUrl = data.signing_url
    || (data.sign_token ? `${appBaseUrl}/sign/${data.sign_token}` : "");
  const downloadUrl = data.download_url || "";
  const hasAccessCode = !!data.has_access_code;
  const type = email.email_type;

  if (type === "completed") {
    const ctaUrl = downloadUrl || signUrl;
    const ctaLabel = downloadUrl ? "Download Document" : "View Document";
    return {
      html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F6F3EE;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(44,42,37,0.06)">
    <div style="width:40px;height:40px;border-radius:10px;background:rgba(61,122,74,0.08);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
      <span style="color:#3D7A4A;font-size:20px">&#10003;</span>
    </div>
    <h1 style="font-size:20px;color:#2C2A25;margin:0 0 8px">All Signatures Complete</h1>
    <p style="font-size:14px;color:#6B6660;line-height:1.6;margin:0 0 20px">
      Hi ${name}, all parties have signed <strong>${envelopeName || "the document"}</strong>. The document is now complete.
    </p>
    ${ctaUrl ? `<a href="${ctaUrl}" style="display:inline-block;padding:12px 28px;background:#6B7F3A;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">${ctaLabel}</a>` : ""}
  </div>
  <p style="text-align:center;font-size:11px;color:#9C958B;margin-top:24px">Sent via Sign Flow</p>
</div>
</body></html>`,
      text: `Hi ${name}, all parties have signed "${envelopeName || "the document"}". The document is now complete.${ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : ""}`,
    };
  }

  if (type === "declined") {
    return {
      html: `<!DOCTYPE html><body style="font-family:Helvetica,Arial,sans-serif;color:#2C2A25"><p>Hi ${name},</p><p>The document <strong>${envelopeName || "(unnamed)"}</strong> was declined.</p></body></html>`,
      text: `The document ${envelopeName || "(unnamed)"} was declined.`,
    };
  }

  const isReminder = type === "reminder";
  return {
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F6F3EE;font-family:'Source Sans Pro',Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:40px 20px">
  <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(44,42,37,0.06)">
    <div style="width:40px;height:40px;border-radius:10px;background:rgba(107,127,58,0.08);display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
      <span style="color:#6B7F3A;font-size:20px">&#9997;</span>
    </div>
    <h1 style="font-size:20px;color:#2C2A25;margin:0 0 8px">${isReminder ? "Reminder: " : ""}Signature Requested</h1>
    <p style="font-size:14px;color:#6B6660;line-height:1.6;margin:0 0 20px">
      Hi ${name}, ${isReminder ? "this is a reminder that your" : "your"} signature is requested on <strong>${envelopeName || "a document"}</strong>. Please review and sign at your earliest convenience.
    </p>
    ${signUrl ? `<a href="${signUrl}" style="display:inline-block;padding:12px 28px;background:#6B7F3A;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Review &amp; Sign</a>` : ""}
    ${hasAccessCode ? `<p style="font-size:12px;color:#6B6660;margin:16px 0 0;line-height:1.5;padding:10px 14px;background:#F6F3EE;border-radius:6px"><strong>Note:</strong> An access code is required to view this document. The sender will provide it to you separately.</p>` : ""}
    <p style="font-size:12px;color:#9C958B;margin:20px 0 0;line-height:1.5">
      This document requires your electronic signature. By signing, you agree to the terms under the ESIGN Act.
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9C958B;margin-top:24px">Sent via Sign Flow</p>
</div>
</body></html>`,
    text: `Hi ${name}, ${isReminder ? "this is a reminder that your" : "your"} signature is requested on "${envelopeName || "a document"}". Please review and sign at your earliest convenience.${signUrl ? `\n\nSign here: ${signUrl}` : ""}${hasAccessCode ? "\n\nNote: An access code is required to view this document. The sender will provide it to you separately." : ""}`,
  };
}
