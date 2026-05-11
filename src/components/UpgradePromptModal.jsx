import { useNavigate } from "react-router-dom";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC",
  forest: "#1E5128", forestSoft: "rgba(30,81,40,0.08)",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

function formatDate(iso) {
  if (!iso) return "next month";
  return new Date(iso).toLocaleDateString("en-US",
    { month: "long", day: "numeric" });
}

function copyFor(kind, nextResetDate) {
  switch (kind) {
    case "envelope":
      return {
        title: "Envelope limit reached",
        body: `You've used all 3 envelopes this month on the Free plan. Your quota resets on ${formatDate(nextResetDate)}, or upgrade to Pro for unlimited envelopes.`,
      };
    case "recipient":
      return {
        title: "Recipient limit reached",
        body: "Free tier allows 2 signing recipients per envelope. Upgrade to Pro for unlimited recipients.",
      };
    case "template":
      return {
        title: "Template limit reached",
        body: "Free tier allows 2 saved templates. Upgrade to Pro for unlimited templates.",
      };
    default:
      return {
        title: "Upgrade required",
        body: "This feature is available on Pro. Upgrade to continue.",
      };
  }
}

export function UpgradePromptModal({ kind, nextResetDate, onClose }) {
  const navigate = useNavigate();
  const { title, body } = copyFor(kind, nextResetDate);

  const upgrade = () => {
    navigate("/settings?tab=billing&action=upgrade-pro");
  };

  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(15,20,24,0.55)",
      zIndex: 300, padding: 16, display: "flex",
      alignItems: "center", justifyContent: "center",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: 28, width: "100%",
        maxWidth: 440, boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
        fontFamily: FONT_SANS,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%",
          background: C.forestSoft, marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={C.forest} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="17 11 12 6 7 11" />
            <polyline points="17 18 12 13 7 18" />
          </svg>
        </div>
        <h3 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600,
          color: C.ink, margin: "0 0 10px" }}>{title}</h3>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.55, margin: "0 0 22px" }}>
          {body}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            background: "transparent", color: C.ink,
            border: `1px solid ${C.border}`,
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}>Maybe later</button>
          <button onClick={upgrade} style={{
            background: C.forest, color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>Upgrade to Pro</button>
        </div>
      </div>
    </div>
  );
}
