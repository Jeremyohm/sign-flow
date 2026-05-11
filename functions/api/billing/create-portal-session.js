import { authenticateRequest, corsHeaders, handleOptions } from "../_lib/auth.js";

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await authenticateRequest(request, env);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });
  }
  const { user, supabase } = auth;
  const userId = user.user_id;

  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" },
      { status: 500, headers: corsHeaders() });
  }

  const { data: sub } = await supabase.from("subscriptions")
    .select("stripe_customer_id").eq("user_id", userId).single();
  if (!sub?.stripe_customer_id) {
    return Response.json({ error: "No subscription found. Upgrade first." },
      { status: 404, headers: corsHeaders() });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const appUrl = env.APP_URL || "https://sign-flow.pages.dev";

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/settings`,
    });
    return Response.json({ url: portal.url }, { headers: corsHeaders() });
  } catch (err) {
    console.error("Portal session error:", err);
    return Response.json({ error: "Failed to create portal session" },
      { status: 500, headers: corsHeaders() });
  }
}
