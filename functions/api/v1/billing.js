import { authenticateRequest, corsHeaders, handleOptions } from "../_lib/auth.js";

const PLANS = {
  free:       { name: "Free",       price: 0,    envelopes: 5,   api: false, price_id: null },
  pro:        { name: "Pro",        price: 1500, envelopes: 50,  api: true,  price_id: null },
  business:   { name: "Business",   price: 4500, envelopes: 500, api: true,  price_id: null },
  enterprise: { name: "Enterprise", price: 0,    envelopes: -1,  api: true,  price_id: null },
};

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method === "OPTIONS") return handleOptions();

  // Resolve Stripe price IDs from env
  PLANS.pro.price_id = env.STRIPE_PRO_PRICE_ID || null;
  PLANS.business.price_id = env.STRIPE_BUSINESS_PRICE_ID || null;

  const auth = await authenticateRequest(request, env);
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status, headers: corsHeaders() });

  const { user, supabase } = auth;
  const userId = user.user_id;
  const appUrl = env.APP_URL || "https://signflow-phi.vercel.app";

  try {
    if (request.method === "GET") {
      const { data: sub } = await supabase
        .from("subscriptions").select("*").eq("user_id", userId).single();

      if (!sub) {
        return Response.json({ plan: "free", ...PLANS.free, envelopes_used: 0, current_period_start: null, current_period_end: null }, { headers: corsHeaders() });
      }

      const planInfo = PLANS[sub.plan] || PLANS.free;
      return Response.json({
        plan: sub.plan, ...planInfo,
        envelopes_used: sub.envelopes_used, envelope_limit: sub.envelope_limit,
        api_access: sub.api_access, current_period_start: sub.current_period_start,
        current_period_end: sub.current_period_end, stripe_customer_id: sub.stripe_customer_id,
      }, { headers: corsHeaders() });
    }

    if (request.method === "POST") {
      const Stripe = (await import("stripe")).default;
      if (!env.STRIPE_SECRET_KEY) return Response.json({ error: "Stripe not configured" }, { status: 500, headers: corsHeaders() });
      const stripe = new Stripe(env.STRIPE_SECRET_KEY);

      const body = await request.json();
      const { plan } = body || {};
      if (!plan || !PLANS[plan] || !PLANS[plan].price_id) {
        return Response.json({ error: "Invalid plan. Choose: pro, business" }, { status: 400, headers: corsHeaders() });
      }

      const { data: sub } = await supabase
        .from("subscriptions").select("*").eq("user_id", userId).single();

      let customerId = sub?.stripe_customer_id;
      if (!customerId) {
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        const customer = await stripe.customers.create({
          email: authUser?.email,
          metadata: { legacysign_user_id: userId },
        });
        customerId = customer.id;
        await supabase.from("subscriptions")
          .upsert({ user_id: userId, stripe_customer_id: customerId, plan: "free", envelope_limit: 5, api_access: false });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId, mode: "subscription",
        line_items: [{ price: PLANS[plan].price_id, quantity: 1 }],
        success_url: `${appUrl}/settings?billing=success`,
        cancel_url: `${appUrl}/settings?billing=cancel`,
        metadata: { user_id: userId, plan },
      });

      return Response.json({ checkout_url: session.url }, { headers: corsHeaders() });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders() });
  } catch (err) {
    console.error("Billing API error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500, headers: corsHeaders() });
  }
}
