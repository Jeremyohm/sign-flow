import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import * as db from "../../lib/db";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { TierCompareTable } from "./TierCompareTable";

export function BillingTab({ notify }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const autoUpgradeFired = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await db.fetchSubscription();
        if (!cancelled) setSub(data || { plan: "free", status: "active" });
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load subscription");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-fire Stripe Checkout when the user lands here from the pricing page
  // (signup intent → /settings?tab=billing&action=upgrade-pro|upgrade-business).
  // Only fires once per page load and only when the user is currently on free.
  useEffect(() => {
    if (autoUpgradeFired.current) return;
    if (loading || !sub) return;
    const action = searchParams.get("action");
    const plan = action === "upgrade-pro" ? "pro"
              : action === "upgrade-business" ? "business" : null;
    if (!plan) return;
    if (sub.plan !== "free") return;

    autoUpgradeFired.current = true;
    // Clear the param so a manual refresh doesn't re-fire Checkout.
    const next = new URLSearchParams(searchParams);
    next.delete("action");
    setSearchParams(next, { replace: true });

    db.createCheckoutSession(plan)
      .then(({ url }) => { window.location.href = url; })
      .catch(err => notify?.(`Couldn't start checkout: ${err.message}`, "warning"));
  }, [loading, sub, searchParams, setSearchParams, notify]);

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center", color: "#5A6168",
      fontFamily: "'Inter', system-ui, sans-serif" }}>Loading…</div>;
  }
  if (error) {
    return <div style={{ padding: 16, background: "#FCEBEB", border: "1px solid #F0B5B5",
      borderRadius: 10, color: "#A32D2D",
      fontFamily: "'Inter', system-ui, sans-serif" }}>{error}</div>;
  }

  return (
    <div>
      <CurrentPlanCard subscription={sub} notify={notify} />
      <TierCompareTable currentPlan={sub?.plan || "free"} notify={notify} />
    </div>
  );
}
