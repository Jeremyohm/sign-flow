import { useState } from "react";
import * as db from "../../lib/db";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC",
  forest: "#1E5128", forestSoft: "rgba(30,81,40,0.08)",
  amber: "#C4841D", amberBg: "rgba(196,132,29,0.10)",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

const PLAN_LABEL = { free: "Free", pro: "Pro", business: "Business" };
const PLAN_PRICE = { free: "$0/mo", pro: "$15/mo", business: "$39/mo" };

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US",
    { year: "numeric", month: "long", day: "numeric" });
}

export function CurrentPlanCard({ subscription, notify }) {
  const [busy, setBusy] = useState(false);
  const plan = subscription?.plan || "free";
  const isPaid = plan === "pro" || plan === "business";

  const openPortal = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await db.createPortalSession();
      window.location.href = url;
    } catch (err) {
      notify?.(`Couldn't open billing portal: ${err.message}`, "warning");
      setBusy(false);
    }
  };

  const upgrade = async (target) => {
    if (busy) return;
    setBusy(true);
    try {
      const { url } = await db.createCheckoutSession(target);
      window.location.href = url;
    } catch (err) {
      notify?.(`Couldn't start checkout: ${err.message}`, "warning");
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 24, marginBottom: 20 }}>
      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600,
        color: C.ink, margin: "0 0 14px" }}>Your plan</h2>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span style={{ background: C.forestSoft, color: C.forest,
          fontSize: 13, fontWeight: 600, fontFamily: FONT_SANS,
          padding: "4px 12px", borderRadius: 999 }}>
          {PLAN_LABEL[plan]}
        </span>
        <span style={{ fontSize: 14, color: C.muted }}>{PLAN_PRICE[plan]}</span>
      </div>

      {subscription?.cancel_at_period_end && (
        <div style={{ padding: "10px 14px", background: C.amberBg,
          border: `1px solid ${C.amber}40`, borderRadius: 8,
          fontSize: 13, color: C.ink, marginBottom: 14 }}>
          Your subscription ends on {formatDate(subscription.current_period_end)}.
          Reactivate from the billing portal.
        </div>
      )}

      {isPaid ? (
        <>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 14px" }}>
            Next billing date: <strong style={{ color: C.ink }}>
              {formatDate(subscription.current_period_end)}
            </strong>
          </p>
          <button onClick={openPortal} disabled={busy} style={{
            background: C.forest, color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 600, cursor: busy ? "wait" : "pointer",
          }}>
            {busy ? "Opening…" : "Manage subscription"}
          </button>
        </>
      ) : (
        <>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 14px" }}>
            Upgrade to unlock unlimited envelopes, recipients, and templates.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => upgrade("pro")} disabled={busy} style={{
              background: C.forest, color: "#fff", border: "none",
              padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
              fontSize: 14, fontWeight: 600, cursor: busy ? "wait" : "pointer",
            }}>Upgrade to Pro · $15/mo</button>
            <button onClick={() => upgrade("business")} disabled={busy} style={{
              background: "transparent", color: C.forest,
              border: `1px solid ${C.forest}`,
              padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
              fontSize: 14, fontWeight: 600, cursor: busy ? "wait" : "pointer",
            }}>Upgrade to Business · $39/mo</button>
          </div>
        </>
      )}
    </div>
  );
}
