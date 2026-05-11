import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ContactAvatar } from "./ContactAvatar";

const C = {
  paper: "#FAFAF7", paperWarm: "#F2F2EE", paperHover: "#EAEAE6",
  ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", forestDark: "#163E1F", forestSoft: "rgba(30,81,40,0.08)",
  border: "#E0E0DC",
  danger: "#A32D2D",
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

export function ContactRow({ contact, onEdit, onHide, isLast = false }) {
  const navigate = useNavigate();
  const [hover, setHover] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const displayName = contact.display_name || contact.derived_name || contact.email;

  const openDetail = () => navigate(`/contacts/${contact.id}`);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
        borderBottom: isLast ? "none" : `1px solid ${C.border}`,
        background: hover ? C.paperHover : "transparent",
        cursor: "pointer", transition: "background 150ms ease",
      }}
      onClick={openDetail}
    >
      <ContactAvatar name={displayName} email={contact.email} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.ink, fontFamily: FONT_SANS,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {displayName}
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT_SANS,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {contact.email}
        </div>
      </div>
      <div style={{ fontSize: 13, color: C.muted, fontFamily: FONT_SANS, flexShrink: 0,
        textAlign: "right", minWidth: 100 }}>
        {contact.total_envelopes} envelope{contact.total_envelopes === 1 ? "" : "s"}
      </div>
      <div style={{ fontSize: 13, color: C.muted, fontFamily: FONT_SANS, flexShrink: 0,
        textAlign: "right", minWidth: 80 }}>
        {timeAgo(contact.last_activity)}
      </div>
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", flexShrink: 0 }}>
        <button onClick={() => setMenuOpen(o => !o)} style={{
          background: "transparent", border: "none", padding: "4px 8px",
          cursor: "pointer", color: C.muted, fontSize: 18, fontWeight: 700,
        }} aria-label="More actions">⋯</button>
        {menuOpen && (
          <>
            <div onClick={() => setMenuOpen(false)}
              style={{ position: "fixed", inset: 0, zIndex: 60 }} />
            <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0,
              background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.10)", zIndex: 70, minWidth: 200,
              padding: 4, fontFamily: FONT_SANS, fontSize: 13 }}>
              <MenuItem onClick={() => { setMenuOpen(false); navigate(`/new?contact=${contact.id}`); }}>
                Send a new envelope
              </MenuItem>
              <MenuItem onClick={() => { setMenuOpen(false); onEdit(contact); }}>
                Edit contact name
              </MenuItem>
              <MenuItem destructive onClick={() => { setMenuOpen(false); onHide(contact); }}>
                Delete
              </MenuItem>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function MenuItem({ children, onClick, destructive }) {
  const [hover, setHover] = useState(false);
  return (
    <button onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: "block", width: "100%", textAlign: "left",
        padding: "8px 12px", border: "none", borderRadius: 6,
        background: hover ? "#F2F2EE" : "transparent",
        color: destructive ? "#A32D2D" : "#0F1418",
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: 13, cursor: "pointer",
      }}>{children}</button>
  );
}
