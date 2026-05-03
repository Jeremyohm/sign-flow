export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const { to, toName, subject, signingUrl, envelopeName, type, hasAccessCode } = await request.json();

  if (!to || !subject) {
    return Response.json({ error: "Missing required fields: to, subject" }, { status: 400 });
  }

  const token = env.POSTMARK_API_TOKEN;
  const from = env.POSTMARK_FROM_EMAIL;

  if (!token || !from) {
    return Response.json({ error: "Email service not configured" }, { status: 500 });
  }

  const htmlBody = buildEmailHtml({ toName, envelopeName, signingUrl, type, hasAccessCode });
  const textBody = buildEmailText({ toName, envelopeName, signingUrl, type, hasAccessCode });

  try {
    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        TextBody: textBody,
        MessageStream: "outbound",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data.Message || "Failed to send email" }, { status: response.status });
    }

    return Response.json({ success: true, messageId: data.MessageID });
  } catch (err) {
    console.error("Email send error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

function buildEmailHtml({ toName, envelopeName, signingUrl, type, hasAccessCode }) {
  const name = toName || "there";

  if (type === "completed") {
    return `
<!DOCTYPE html>
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
    ${signingUrl ? `<a href="${signingUrl}" style="display:inline-block;padding:12px 28px;background:#6B7F3A;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">View Document</a>` : ""}
  </div>
  <p style="text-align:center;font-size:11px;color:#9C958B;margin-top:24px">Sent via Legacy Sign</p>
</div>
</body></html>`;
  }

  const isReminder = type === "reminder";
  return `
<!DOCTYPE html>
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
    ${signingUrl ? `<a href="${signingUrl}" style="display:inline-block;padding:12px 28px;background:#6B7F3A;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">Review & Sign</a>` : ""}
    ${hasAccessCode ? `<p style="font-size:12px;color:#6B6660;margin:16px 0 0;line-height:1.5;padding:10px 14px;background:#F6F3EE;border-radius:6px"><strong>Note:</strong> An access code is required to view this document. The sender will provide it to you separately.</p>` : ""}
    <p style="font-size:12px;color:#9C958B;margin:20px 0 0;line-height:1.5">
      This document requires your electronic signature. By signing, you agree to the terms under the ESIGN Act.
    </p>
  </div>
  <p style="text-align:center;font-size:11px;color:#9C958B;margin-top:24px">Sent via Legacy Sign</p>
</div>
</body></html>`;
}

function buildEmailText({ toName, envelopeName, signingUrl, type, hasAccessCode }) {
  const name = toName || "there";
  if (type === "completed") {
    return `Hi ${name}, all parties have signed "${envelopeName || "the document"}". The document is now complete.${signingUrl ? `\n\nView document: ${signingUrl}` : ""}`;
  }
  const isReminder = type === "reminder";
  const accessNote = hasAccessCode ? "\n\nNote: An access code is required to view this document. The sender will provide it to you separately." : "";
  return `Hi ${name}, ${isReminder ? "this is a reminder that your" : "your"} signature is requested on "${envelopeName || "a document"}". Please review and sign at your earliest convenience.${signingUrl ? `\n\nSign here: ${signingUrl}` : ""}${accessNote}`;
}
