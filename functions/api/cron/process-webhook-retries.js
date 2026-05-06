import { createClient } from "@supabase/supabase-js";

const BATCH_SIZE = 25;
const MAX_ATTEMPTS = 6;
// Backoff per attempt: 1m, 5m, 30m, 2h, 12h, 24h
const BACKOFF_MINUTES = [1, 5, 30, 120, 720, 1440];

export async function onRequestPost(context) {
  const { request, env } = context;

  const authHeader = request.headers.get("x-cron-secret");
  if (!env.CRON_SECRET || authHeader !== env.CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY,
  );

  const { data: deliveries, error: fetchError } = await supabase
    .from("webhook_retry_queue")
    .select("*, webhook:webhooks(*)")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    return Response.json({ error: "fetch_failed", detail: fetchError.message }, { status: 500 });
  }

  if (!deliveries || deliveries.length === 0) {
    return Response.json({ processed: 0 });
  }

  const results = await Promise.all(deliveries.map(async (d) => {
    const { data: locked, error: lockError } = await supabase
      .from("webhook_retry_queue")
      .update({ status: "delivering" })
      .eq("id", d.id)
      .eq("status", "pending")
      .select("id");

    if (lockError || !locked || locked.length === 0) {
      return { id: d.id, ok: false, reason: "lock_failed" };
    }

    if (!d.webhook || !d.webhook.active) {
      await supabase.from("webhook_retry_queue")
        .update({ status: "dead", last_error: "webhook inactive" })
        .eq("id", d.id);
      return { id: d.id, ok: false, reason: "webhook_inactive" };
    }

    try {
      const bodyString = JSON.stringify(d.payload);
      const signature = await hmacSha256(d.webhook.secret, bodyString);

      const res = await fetch(d.webhook.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-SignFlow-Event": d.event,
          "X-SignFlow-Signature": signature,
        },
        body: bodyString,
        signal: AbortSignal.timeout(15000),
      });

      const responseBody = await res.text().catch(() => "");

      if (res.ok) {
        await supabase.from("webhook_deliveries").insert({
          webhook_id: d.webhook_id,
          event: d.event,
          payload: d.payload,
          response_status: res.status,
          response_body: responseBody.slice(0, 1000),
          success: true,
        });

        await supabase.from("webhook_retry_queue")
          .update({ status: "delivered", attempt_count: d.attempt_count + 1 })
          .eq("id", d.id);

        await supabase.from("webhooks")
          .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
          .eq("id", d.webhook_id);

        return { id: d.id, ok: true };
      }

      throw new Error(`HTTP ${res.status}: ${responseBody.slice(0, 200)}`);
    } catch (err) {
      const newAttemptCount = d.attempt_count + 1;
      const isDead = newAttemptCount >= MAX_ATTEMPTS;
      const backoffIdx = Math.min(newAttemptCount - 1, BACKOFF_MINUTES.length - 1);
      const nextAttempt = new Date(Date.now() + BACKOFF_MINUTES[backoffIdx] * 60 * 1000);

      await supabase.from("webhook_retry_queue")
        .update({
          status: isDead ? "dead" : "pending",
          attempt_count: newAttemptCount,
          next_attempt_at: nextAttempt.toISOString(),
          last_error: String(err).slice(0, 1000),
        })
        .eq("id", d.id);

      const newFailureCount = (d.webhook.failure_count || 0) + 1;
      await supabase.from("webhooks")
        .update({ failure_count: newFailureCount, active: newFailureCount < 10 })
        .eq("id", d.webhook_id);

      await supabase.from("webhook_deliveries").insert({
        webhook_id: d.webhook_id,
        event: d.event,
        payload: d.payload,
        response_status: null,
        response_body: String(err).slice(0, 1000),
        success: false,
      });

      return { id: d.id, ok: false, reason: String(err) };
    }
  }));

  return Response.json({
    processed: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
  });
}

async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
