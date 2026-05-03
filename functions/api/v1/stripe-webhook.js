import { createClient } from "@supabase/supabase-js";

const PLANS = {
  pro:      { envelope_limit: 50,  api_access: true },
  business: { envelope_limit: 500, api_access: true },
};

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  if (!env.STRIPE_SECRET_KEY) {
    return Response.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const Stripe = (await import("stripe")).default;
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const sig = request.headers.get("stripe-signature");
  const endpointSecret = env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    const rawBody = await request.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, endpointSecret);
  } catch (err) {
    console.error("Stripe webhook verification failed:", err.message);
    return Response.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  const supabase = createClient(
    env.SUPABASE_URL || env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_KEY
  );

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.user_id;
        const plan = session.metadata?.plan;
        if (userId && plan && PLANS[plan]) {
          await supabase.from("subscriptions").upsert({
            user_id: userId, plan,
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            envelope_limit: PLANS[plan].envelope_limit,
            api_access: PLANS[plan].api_access,
            envelopes_used: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: "user_id" });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        if (sub.cancel_at_period_end) {
          console.log("Subscription cancellation scheduled:", sub.id);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        await supabase.from("subscriptions").update({
          plan: "free", envelope_limit: 5, api_access: false, stripe_subscription_id: null,
        }).eq("stripe_subscription_id", sub.id);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        if (invoice.billing_reason === "subscription_cycle") {
          await supabase.from("subscriptions").update({
            envelopes_used: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }).eq("stripe_customer_id", invoice.customer);
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return Response.json({ error: "Processing failed" }, { status: 500 });
  }
}
