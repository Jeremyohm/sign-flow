import { Ic, I } from "./ui";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC", paperHover: "#EAEAE6",
  forest: "#1E5128", danger: "#A32D2D", amber: "#C4841D",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function iconFor(type) {
  switch (type) {
    case "signer_signed":      return { icon: I.check, color: C.forest };
    case "signer_declined":    return { icon: I.x,     color: C.danger };
    case "envelope_completed": return { icon: I.star,  color: C.forest };
    case "envelope_expiring":  return { icon: I.clock, color: C.amber };
    case "signer_first_view":  return { icon: I.eye,   color: C.muted };
    case "email_bounced":      return { icon: I.mail,  color: C.danger };
    default:                   return { icon: I.bell,  color: C.muted };
  }
}

export function NotificationRow({ notification: n, onClick, variant = "page", isLast = false }) {
  const { icon, color } = iconFor(n.event_type);
  const unread = !n.is_read;
  const padding = variant === "dropdown" ? "10px 14px" : "14px 16px";

  return (
    <button onClick={() => onClick?.(n)} style={{
      display: "flex", alignItems: "flex-start", gap: 12,
      padding, width: "100%", textAlign: "left", background: "transparent",
      border: "none", borderBottom: isLast ? "none" : `1px solid ${C.border}`,
      cursor: "pointer", fontFamily: FONT_SANS, color: C.ink,
      transition: "background 150ms ease",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = C.paperHover; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 6,
        background: unread ? C.forest : "transparent", flexShrink: 0 }} />
      <span style={{ width: 28, height: 28, borderRadius: "50%",
        background: `${color}1A`, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ic d={icon} size={15} color={color} s />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: variant === "dropdown" ? 13 : 14,
          fontWeight: unread ? 600 : 500, color: C.ink,
          overflow: "hidden", textOverflow: "ellipsis",
          whiteSpace: variant === "dropdown" ? "nowrap" : "normal",
          lineHeight: 1.35 }}>
          {n.title}
        </span>
        {n.body && variant !== "dropdown" && (
          <span style={{ display: "block", fontSize: 13, color: C.muted,
            marginTop: 2, lineHeight: 1.4 }}>{n.body}</span>
        )}
        <span style={{ display: "block", fontSize: 11, color: C.muted, marginTop: 4 }}>
          {timeAgo(n.created_at)}
        </span>
      </span>
    </button>
  );
}
