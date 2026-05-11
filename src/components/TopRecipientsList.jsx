import { Link } from "react-router-dom";
import { ContactAvatar } from "./ContactAvatar";

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

function timeAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function displayName(r) {
  return r.display_name || r.derived_name || (r.email || "").split("@")[0] || r.email;
}

export function TopRecipientsList({ recipients }) {
  const rows = (recipients || []).slice(0, 10);
  return (
    <div style={{ background: "#fff", border: "1px solid #E0E0DC", borderRadius: 12,
      padding: 20, display: "flex", flexDirection: "column" }}>
      <h3 style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600,
        color: "#0F1418", margin: "0 0 16px" }}>Top recipients</h3>
      {rows.length === 0 ? (
        <div style={{ padding: "24px 0", textAlign: "center", color: "#5A6168",
          fontSize: 14, fontFamily: FONT_SANS }}>
          No activity in this period
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map(r => (
            <div key={r.email} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ContactAvatar name={displayName(r)} email={r.email} size={36} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#0F1418",
                  fontFamily: FONT_SANS, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayName(r)}
                </div>
                <div style={{ fontSize: 12, color: "#5A6168", fontFamily: FONT_SANS,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.email}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#0F1418",
                  fontFamily: FONT_SANS, fontVariantNumeric: "tabular-nums" }}>
                  {r.envelope_count}
                </div>
                <div style={{ fontSize: 11, color: "#5A6168", fontFamily: FONT_SANS,
                  marginTop: 2 }}>
                  {timeAgo(r.last_activity)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Link to="/contacts" style={{
        marginTop: 18, color: "#1E5128", fontSize: 13, fontWeight: 500,
        fontFamily: FONT_SANS, textDecoration: "none",
        alignSelf: "flex-start",
      }}>View all in Contacts →</Link>
    </div>
  );
}
