import { authenticateRequest, corsHeaders, handleOptions } from "../_lib/auth.js";

const PLAN_LIMITS = {
  pro:      { envelope_limit: 50,  api_access: true },
  business: { envelope_limit: 500, api_access: true },
};

export async function onRequestOptions() { return handleOptions(); }

export async function onRequestPost(context) {
  const { request, env } = context;
  const auth = await authenticateRequest(request, env);
  if (auth.error) {
    return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });
  }
  const { user, supabase } = auth;
  const userId = user.user_id;

  let plan;
  try {
    const body = await request.json();
    plan = body?.plan;
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: corsHeaders() });
  }

  const priceId = plan === "pro" ? env.STRIPE_PRO_PRICE_ID
                : plan === "business" ? env.STRIPE_BUSINESS_PRICE_ID
                : null;
  if (!priceId) {
    return Response.json({ error: "Invalid plan. Choose: pro or business" },
      { status: 400, headers: corsHeaders() });
  }
  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" },
      { status: 500, headers: corsHeaders() });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const appUrl = env.APP_URL || "https://sign-flow.net";

  // Reuse or create the Stripe customer for this user.
  const { data: sub } = await supabase.from("subscriptions")
    .select("stripe_customer_id").eq("user_id", userId).single();
  let customerId = sub?.stripe_customer_id;
  if (!customerId) {
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
    const customer = await stripe.customers.create({
      email: authUser?.email,
      metadata: { signflow_user_id: userId },
    });
    customerId = customer.id;
    await supabase.from("subscriptions").upsert({
      user_id: userId, plan: "free", status: "active",
      stripe_customer_id: customerId,
      envelope_limit: 5, api_access: false,
    }, { onConflict: "user_id" });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancel`,
      metadata: { user_id: userId, plan },
      subscription_data: { metadata: { user_id: userId, plan } },
    });
    return Response.json({ url: session.url }, { headers: corsHeaders() });
  } catch (err) {
    console.error("Checkout session error:", err);
    return Response.json({ error: "Failed to create checkout session" },
      { status: 500, headers: corsHeaders() });
  }
}
