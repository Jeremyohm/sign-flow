// Diagnostic: prints whether each Stripe env var is present, the mode of the
// secret key (test vs live), and whether the price IDs look syntactically valid.
// Never reveals the actual secret values. Auth-gated by CRON_SECRET so it's
// not anonymous-readable. Remove after verification.

export async function onRequest(context) {
  const { env, request } = context;
  const auth = request.headers.get("Authorization");
  if (auth !== `Bearer ${env.CRON_SECRET}`) {
    return new Response("unauthorized", { status: 401 });
  }

  const sk = env.STRIPE_SECRET_KEY || "";
  const skMode = sk.startsWith("sk_test_") ? "test"
              : sk.startsWith("sk_live_") ? "live"
              : sk ? "unknown_prefix" : "missing";

  const proId = env.STRIPE_PRO_PRICE_ID || "";
  const busId = env.STRIPE_BUSINESS_PRICE_ID || "";
  const whsec = env.STRIPE_WEBHOOK_SECRET || "";

  return Response.json({
    STRIPE_SECRET_KEY: {
      present: !!sk,
      mode: skMode,
      length: sk.length,
    },
    STRIPE_PRO_PRICE_ID: {
      present: !!proId,
      looks_valid: proId.startsWith("price_"),
      first10: proId.slice(0, 10),
    },
    STRIPE_BUSINESS_PRICE_ID: {
      present: !!busId,
      looks_valid: busId.startsWith("price_"),
      first10: busId.slice(0, 10),
    },
    STRIPE_WEBHOOK_SECRET: {
      present: !!whsec,
      looks_valid: whsec.startsWith("whsec_"),
      length: whsec.length,
    },
    APP_URL: env.APP_URL || null,
  });
}
