import { useState, useEffect } from "react";
import * as db from "../../lib/db";
import { CurrentPlanCard } from "./CurrentPlanCard";
import { TierCompareTable } from "./TierCompareTable";

export function BillingTab({ notify }) {
  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
