import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Ic, I } from "./ui";
import { useNotifications } from "../lib/useNotifications";
import { NotificationRow } from "./NotificationRow";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC", paper: "#FAFAF7",
  paperHover: "#EAEAE6", forest: "#1E5128",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // "all" | "unread"
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications();

  const visible = useMemo(
    () => filter === "unread" ? notifications.filter(n => !n.is_read) : notifications,
    [filter, notifications]
  );

  const handleRowClick = async (n) => {
    setOpen(false);
    if (!n.is_read) markRead(n.id);
    if (n.envelope_id) navigate(`/envelope/${n.envelope_id}`);
  };

  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} aria-label="Notifications" style={{
        background: "transparent", border: "none", cursor: "pointer", padding: 8,
        borderRadius: 6, display: "inline-flex", alignItems: "center", position: "relative",
        transition: "background 150ms ease",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = C.paperHover; }}
        onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
        <Ic d={I.bell} size={18} color={C.ink} s />
        {unreadCount > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2,
            minWidth: 18, height: 18, padding: "0 5px",
            background: C.forest, color: "#fff",
            fontSize: 10, fontWeight: 700, fontFamily: FONT_SANS,
            borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #fff", boxSizing: "content-box" }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 80 }} />
          <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0,
            width: 400, maxHeight: 480, background: "#fff",
            border: `1px solid ${C.border}`, borderRadius: 12,
            boxShadow: "0 10px 32px rgba(0,0,0,0.10)", zIndex: 90,
            fontFamily: FONT_SANS, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
              display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>Notifications</span>
              <button onClick={() => markAllRead()} disabled={unreadCount === 0} style={{
                background: "transparent", border: "none", padding: 0,
                color: unreadCount === 0 ? C.muted : C.forest,
                fontSize: 12, fontWeight: 500, fontFamily: FONT_SANS,
                cursor: unreadCount === 0 ? "default" : "pointer",
              }}>Mark all as read</button>
            </div>
            <div style={{ display: "flex", gap: 4, padding: "8px 12px",
              borderBottom: `1px solid ${C.border}` }}>
              {["all", "unread"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  background: filter === f ? C.forest : "transparent",
                  color: filter === f ? "#fff" : C.muted,
                  border: "none", borderRadius: 6, padding: "5px 12px",
                  fontSize: 12, fontWeight: 500, fontFamily: FONT_SANS, cursor: "pointer",
                  textTransform: "capitalize",
                }}>{f}</button>
              ))}
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {loading ? (
                <div style={{ padding: 24, textAlign: "center", color: C.muted, fontSize: 13 }}>
                  Loading…
                </div>
              ) : visible.length === 0 ? (
                <div style={{ padding: "32px 24px", textAlign: "center" }}>
                  <p style={{ fontSize: 14, color: C.ink, margin: "0 0 4px", fontWeight: 500 }}>
                    {filter === "unread" ? "You're all caught up." : "No notifications yet"}
                  </p>
                  <p style={{ fontSize: 12, color: C.muted, margin: 0 }}>
                    {filter === "unread"
                      ? "Switch to All to see past notifications."
                      : "We'll let you know when something happens."}
                  </p>
                </div>
              ) : visible.map((n, i) => (
                <NotificationRow key={n.id} notification={n} variant="dropdown"
                  isLast={i === visible.length - 1} onClick={handleRowClick} />
              ))}
            </div>
            <Link to="/notifications" onClick={() => setOpen(false)} style={{
              padding: "10px 16px", borderTop: `1px solid ${C.border}`,
              color: C.forest, fontSize: 13, fontWeight: 500, fontFamily: FONT_SANS,
              textDecoration: "none", textAlign: "center", background: C.paper,
            }}>View all in Notifications →</Link>
          </div>
        </>
      )}
    </div>
  );
}
