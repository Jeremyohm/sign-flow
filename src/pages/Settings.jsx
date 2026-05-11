import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocTitle } from "../utils";
import { ProfileTab } from "../components/settings/ProfileTab";
import { BillingTab } from "../components/settings/BillingTab";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC", forest: "#1E5128",
  forestSoft: "rgba(30,81,40,0.08)",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

const TABS = [
  { id: "profile", label: "Profile" },
  { id: "billing", label: "Billing" },
];

export function Settings({ notify }) {
  useDocTitle("Settings");
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.find(t => t.id === searchParams.get("tab"))?.id || "profile";
  const [tab, setTab] = useState(initialTab);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") notify?.("Subscription updated. It may take a moment to reflect.");
    if (billing === "cancel") notify?.("Checkout canceled.", "warning");
    if (billing) {
      const next = new URLSearchParams(searchParams);
      next.delete("billing");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectTab = (id) => {
    setTab(id);
    const next = new URLSearchParams(searchParams);
    next.set("tab", id);
    setSearchParams(next, { replace: true });
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px",
      fontFamily: FONT_SANS, color: C.ink }}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600,
          margin: "0 0 4px", color: C.ink, letterSpacing: "-0.01em" }}>Settings</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
          Manage your account and subscription
        </p>
      </header>

      <div style={{ display: "flex", gap: 24, borderBottom: `1px solid ${C.border}`,
        marginBottom: 24 }}>
        {TABS.map(t => {
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => selectTab(t.id)} style={{
              background: "transparent", border: "none", padding: "10px 0",
              fontSize: 14, fontWeight: active ? 600 : 500,
              color: active ? C.forest : C.muted, fontFamily: FONT_SANS,
              cursor: "pointer", borderBottom: `2px solid ${active ? C.forest : "transparent"}`,
              marginBottom: -1, transition: "color 150ms ease",
            }}>{t.label}</button>
          );
        })}
      </div>

      {tab === "profile" && <ProfileTab notify={notify} />}
      {tab === "billing" && <BillingTab notify={notify} />}
    </div>
  );
}
