// Sliding-window rate limiter backed by Workers KV.
//
// kv: the KV namespace binding (e.g. env.RATE_LIMIT_KV). If unbound (local dev,
//     unconfigured deploy), the call is allowed but a warning is logged.
// key: the bucket key (e.g. `sign:<ip>` or `accesscode:<token>`).
// limit: max requests permitted in the window.
// windowSec: window length in seconds.

export async function checkRateLimit(kv, key, limit, windowSec) {
  if (!kv) {
    console.warn("Rate limit KV not bound; allowing request");
    return { allowed: true, remaining: limit };
  }

  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSec;

  let timestamps = [];
  try {
    const raw = await kv.get(key);
    if (raw) timestamps = JSON.parse(raw);
  } catch (e) {
    timestamps = [];
  }

  timestamps = timestamps.filter(t => t > windowStart);

  if (timestamps.length >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(1, timestamps[0] + windowSec - now),
    };
  }

  timestamps.push(now);
  await kv.put(key, JSON.stringify(timestamps), { expirationTtl: windowSec * 2 });

  return { allowed: true, remaining: limit - timestamps.length };
}
