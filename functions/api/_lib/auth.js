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
  return hmacSha256(env.API_KEY_SECRET || "sign-flow-secret", key);
}

// Generate a random hex string (Workers-compatible)
export function randomHex(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string comparison. Returns false fast on length mismatch but still
// XORs the shorter buffer to keep timing roughly stable.
function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) {
    let dummy = 0;
    for (let i = 0; i < aBytes.length; i++) dummy |= aBytes[i];
    return false;
  }
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

// Derive the stored prefix shape: matches keys.js (rawKey.slice(0, 16) + "...").
function apiKeyPrefix(rawKey) {
  return rawKey.slice(0, 16) + "...";
}

// Validate API key from Authorization header, return user context
export async function authenticateRequest(request, env) {
  const supabase = getSupabase(env);
  const authHeader = request.headers.get("authorization") || "";

  // Try API key auth: "Bearer sf_live_..."
  if (authHeader.startsWith("Bearer sf_")) {
    const key = authHeader.slice(7);
    const providedHash = await hashApiKey(key, env);
    const prefix = apiKeyPrefix(key);

    // Lookup candidates by prefix (service role bypasses RLS), then compare hashes
    // in constant time to avoid leaking which keys exist via timing.
    const { data: candidates, error: lookupError } = await supabase
      .from("api_keys")
      .select("id, user_id, scopes, key_hash")
      .eq("key_prefix", prefix)
      .is("revoked_at", null);

    if (lookupError) {
      return { error: "Invalid API key", status: 401 };
    }

    let matched = null;
    for (const cand of (candidates || [])) {
      if (timingSafeEqual(providedHash, cand.key_hash)) {
        matched = cand;
        break;
      }
    }
    if (!matched) {
      return { error: "Invalid API key", status: 401 };
    }

    // Update last_used_at (non-blocking) and pull the subscription separately.
    supabase.from("api_keys").update({ last_used_at: new Date().toISOString() })
      .eq("id", matched.id).then(() => {}, () => {});

    const { data: sub } = await supabase
      .from("subscriptions").select("plan, api_access, envelope_limit, envelopes_used")
      .eq("user_id", matched.user_id).single();

    const user = {
      user_id: matched.user_id,
      key_id: matched.id,
      scopes: matched.scopes,
      plan: sub?.plan || "free",
      api_access: !!sub?.api_access,
      envelope_limit: sub?.envelope_limit ?? 5,
      envelopes_used: sub?.envelopes_used ?? 0,
    };

    if (!user.api_access) {
      return { error: "API access requires a Pro or Business plan.", status: 403 };
    }
    return { user, supabase };
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

// Dispatch webhook events by enqueuing into webhook_retry_queue. The cron worker
// handles delivery, exponential backoff, and dead-letter after MAX_ATTEMPTS.
export async function dispatchWebhooks(supabase, userId, event, payload) {
  try {
    const { data: webhooks } = await supabase.rpc("get_active_webhooks", {
      p_user_id: userId,
      p_event: event,
    });
    if (!webhooks || webhooks.length === 0) return;

    const body = { event, timestamp: new Date().toISOString(), data: payload };
    const rows = webhooks.map((wh) => ({
      webhook_id: wh.id,
      event,
      payload: body,
      next_attempt_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from("webhook_retry_queue").insert(rows);
    if (error) console.error("Webhook enqueue error:", error);
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
