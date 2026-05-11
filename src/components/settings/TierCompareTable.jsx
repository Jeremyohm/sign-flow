import { useState } from "react";
import * as db from "../../lib/db";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC",
  forest: "#1E5128", paperWarm: "#F2F2EE",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

const TIERS = [
  { id: "free",     label: "Free",     price: "$0/mo"  },
  { id: "pro",      label: "Pro",      price: "$15/mo" },
  { id: "business", label: "Business", price: "$39/mo" },
];

const ROWS = [
  { label: "Envelopes per month",  values: ["3", "Unlimited", "Unlimited"] },
  { label: "Recipients per envelope", values: ["2", "Unlimited", "Unlimited"] },
  { label: "Sign Flow branding on docs", values: ["Yes (attribution)", "No", "No"] },
  { label: "Saved templates", values: ["2", "Unlimited", "Unlimited"] },
  { label: "Envelope history", values: ["30 days", "Full", "Full"] },
  { label: "Custom email reply-to", values: [false, true, true] },
  { label: "API access", values: [false, "Basic", "Full + webhooks"] },
  { label: "Multi-user accounts", values: [false, false, true] },
  { label: "Custom branding on certs", values: [false, false, true] },
  { label: "Advanced reports + exports", values: [false, false, true] },
  { label: "Support", values: ["Community", "Email", "Priority"] },
];

const TIER_ORDER = { free: 0, pro: 1, business: 2 };

export function TierCompareTable({ currentPlan, notify }) {
  const [busy, setBusy] = useState(false);

  const handleAction = async (target) => {
    if (busy) return;
    setBusy(true);
    try {
      const currentIdx = TIER_ORDER[currentPlan] ?? 0;
      const targetIdx = TIER_ORDER[target];
      if (targetIdx > currentIdx) {
        const { url } = await db.createCheckoutSession(target);
        window.location.href = url;
      } else {
        // Downgrade / lateral → use the Customer Portal
        const { url } = await db.createPortalSession();
        window.location.href = url;
      }
    } catch (err) {
      notify?.(`Couldn't start ${target === "free" ? "downgrade" : "upgrade"}: ${err.message}`,
        "warning");
      setBusy(false);
    }
  };

  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 24 }}>
      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600,
        color: C.ink, margin: "0 0 14px" }}>Compare plans</h2>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse",
          fontFamily: FONT_SANS, fontSize: 13, color: C.ink }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "12px 8px", borderBottom: `1px solid ${C.border}` }}></th>
              {TIERS.map(t => {
                const isCurrent = currentPlan === t.id;
                return (
                  <th key={t.id} style={{ padding: "12px 8px", verticalAlign: "top",
                    minWidth: 140, borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600,
                      color: C.ink, marginBottom: 2 }}>{t.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>{t.price}</div>
                    {isCurrent ? (
                      <button disabled style={{
                        background: C.paperWarm, color: C.muted, border: "none",
                        padding: "7px 14px", borderRadius: 8, fontFamily: FONT_SANS,
                        fontSize: 12, fontWeight: 600, width: "100%", cursor: "default",
                      }}>Current plan</button>
                    ) : t.id === "free" ? (
                      <button onClick={() => handleAction(t.id)} disabled={busy} style={tierBtnSecondary(busy)}>
                        Downgrade
                      </button>
                    ) : (
                      <button onClick={() => handleAction(t.id)} disabled={busy} style={tierBtnPrimary(busy)}>
                        {(TIER_ORDER[currentPlan] ?? 0) > TIER_ORDER[t.id] ? "Switch" : `Upgrade`}
                      </button>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${C.border}` }}>
                <td style={{ padding: "10px 8px", color: C.muted }}>{row.label}</td>
                {row.values.map((v, j) => (
                  <td key={j} style={{ padding: "10px 8px", textAlign: "center" }}>
                    {renderCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderCell(v) {
  if (v === true) return <span style={{ color: C.forest, fontWeight: 700, fontSize: 16 }}>✓</span>;
  if (v === false) return <span style={{ color: C.border }}>—</span>;
  return <span>{v}</span>;
}

const tierBtnPrimary = (busy) => ({
  background: C.forest, color: "#fff", border: "none",
  padding: "7px 14px", borderRadius: 8, fontFamily: FONT_SANS,
  fontSize: 12, fontWeight: 600, width: "100%", cursor: busy ? "wait" : "pointer",
});
const tierBtnSecondary = (busy) => ({
  background: "transparent", color: C.forest, border: `1px solid ${C.border}`,
  padding: "7px 14px", borderRadius: 8, fontFamily: FONT_SANS,
  fontSize: 12, fontWeight: 600, width: "100%", cursor: busy ? "wait" : "pointer",
});
