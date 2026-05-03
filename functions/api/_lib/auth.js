import { createClient } from "@supabase/supabase-js";

// Create Supabase client from env
export function getSupabase(env) {
  return createClient(
    env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
  );
}

// HMAC-SHA256 using Web Crypto API (Workers-compatible)
async function hmacSha256(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Hash an API key for storage/lookup
export async function hashApiKey(key, env) {
  return hmacSha256(env.API_KEY_SECRET || "legacy-sign-secret", key);
}

// Generate a random hex string (Workers-compatible)
export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Validate API key from Authorization header, return user context
export async function authenticateRequest(request, env) {
  const supabase = getSupabase(env);
  const authHeader = request.headers.get("authorization") || "";

  // Try API key auth: "Bearer sf_live_..."
  if (authHeader.startsWith("Bearer sf_")) {
    const key = authHeader.slice(7);
    const keyHash = await hashApiKey(key, env);

    const { data, error } = await supabase.rpc("validate_api_key", { p_key_hash: keyHash });
    if (error || !data) {
      return { error: "Invalid API key", status: 401 };
    }
    if (!data.api_access) {
      return { error: "API access requires a Pro or Business plan.", status: 403 };
    }
    return { user: data, supabase };
  }

  // Try Supabase JWT auth: "Bearer eyJ..."
  if (authHeader.startsWith("Bearer ey")) {
    const token = authHeader.slice(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return { error: "Invalid token", status: 401 };
    }
    return {
      user: { user_id: user.id, scopes: ["*"], plan: "owner", api_access: true },
      supabase,
    };
  }

  return { error: "Missing Authorization header. Use: Bearer sf_live_YOUR_KEY", status: 401 };
}

// Check if user has required scope
export function hasScope(user, scope) {
  if (user.scopes.includes("*")) return true;
  return user.scopes.includes(scope);
}

// Log API usage
export async function logUsage(supabase, userId, keyId, endpoint, method, statusCode) {
  try {
    await supabase.from("api_usage").insert({
      user_id: userId,
      api_key_id: keyId || null,
      endpoint,
      method,
      status_code: statusCode,
    });
  } catch (e) {
    // Non-blocking
  }
}

// HMAC signature for webhook payloads
export async function signPayload(payload, secret) {
  return hmacSha256(secret, JSON.stringify(payload));
}

// Dispatch webhook events to all matching subscribers
export async function dispatchWebhooks(supabase, userId, event, payload) {
  try {
    const { data: webhooks } = await supabase.rpc("get_active_webhooks", {
      p_user_id: userId,
      p_event: event,
    });
    if (!webhooks || webhooks.length === 0) return;

    const deliveries = webhooks.map(async (wh) => {
      const body = { event, timestamp: new Date().toISOString(), data: payload };
      const signature = await signPayload(body, wh.secret);

      try {
        const response = await fetch(wh.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-LegacySign-Signature": signature,
            "X-LegacySign-Event": event,
          },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(10000),
        });

        await supabase.from("webhook_deliveries").insert({
          webhook_id: wh.id,
          event,
          payload: body,
          response_status: response.status,
          success: response.ok,
        });

        if (!response.ok) {
          await supabase.from("webhooks")
            .update({ failure_count: wh.failure_count + 1 })
            .eq("id", wh.id);
        } else {
          await supabase.from("webhooks")
            .update({ last_triggered_at: new Date().toISOString(), failure_count: 0 })
            .eq("id", wh.id);
        }
      } catch (err) {
        await supabase.from("webhook_deliveries").insert({
          webhook_id: wh.id,
          event,
          payload: body,
          response_status: 0,
          response_body: err.message,
          success: false,
        });
        await supabase.from("webhooks")
          .update({ failure_count: wh.failure_count + 1 })
          .eq("id", wh.id);
      }
    });

    await Promise.allSettled(deliveries);
  } catch (e) {
    console.error("Webhook dispatch error:", e);
  }
}

// CORS headers helper
export function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// Handle OPTIONS preflight
export function handleOptions() {
  return new Response(null, { headers: corsHeaders() });
}
