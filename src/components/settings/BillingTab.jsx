import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import * as db from "../../lib/db";
import { useTierLimits } from "../../lib/useTierLimits";
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
      <UsageStrip />
      <CurrentPlanCard subscription={sub} notify={notify} />
      <TierCompareTable currentPlan={sub?.plan || "free"} notify={notify} />
    </div>
  );
}

function UsageStrip() {
  const { isFree, limits, usage, loading } = useTierLimits();
  if (loading || !isFree || !usage) return null;
  const used = usage.envelopes_this_month || 0;
  const cap = limits?.envelopes_per_month || 3;
  const pct = Math.min(100, Math.round((used / cap) * 100));
  const reset = usage.next_reset_date
    ? new Date(usage.next_reset_date).toLocaleDateString("en-US",
        { month: "long", day: "numeric" })
    : null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E0E0DC",
      borderRadius: 12, padding: "16px 20px", marginBottom: 20,
      fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between",
        alignItems: "center", marginBottom: 10, fontSize: 13, color: "#0F1418" }}>
        <span><strong>{used}</strong> of {cap} envelopes used this month</span>
        {reset && <span style={{ color: "#5A6168", fontSize: 12 }}>Resets {reset}</span>}
      </div>
      <div style={{ height: 6, background: "#E0E0DC", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%",
          background: pct >= 100 ? "#C4841D" : "#1E5128",
          transition: "width 200ms ease" }} />
      </div>
    </div>
  );
}
