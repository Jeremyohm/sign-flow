import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDocTitle } from "../utils";
import { useNotifications } from "../lib/useNotifications";
import { NotificationRow } from "../components/NotificationRow";
import { Ic, I } from "../components/ui";

const C = {
  paper: "#FAFAF7", paperWarm: "#F2F2EE", border: "#E0E0DC",
  ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", forestSoft: "rgba(30,81,40,0.08)",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

const FILTERS = [
  { id: "all",       label: "All",       match: () => true },
  { id: "unread",    label: "Unread",    match: n => !n.is_read },
  { id: "signed",    label: "Signed",    match: n => n.event_type === "signer_signed" },
  { id: "declined",  label: "Declined",  match: n => n.event_type === "signer_declined" },
  { id: "completed", label: "Completed", match: n => n.event_type === "envelope_completed" },
];
const PAGE_SIZE = 25;

export function Notifications() {
  useDocTitle("Notifications");
  const navigate = useNavigate();
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications();
  const [filterId, setFilterId] = useState("all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filter = FILTERS.find(f => f.id === filterId) || FILTERS[0];
  const filtered = useMemo(() => notifications.filter(filter.match), [notifications, filter]);
  const slice = filtered.slice(0, visible);

  const handleRowClick = async (n) => {
    if (!n.is_read) markRead(n.id);
    if (n.envelope_id) navigate(`/envelope/${n.envelope_id}`);
  };

  return (
    <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 24px",
      fontFamily: FONT_SANS, color: C.ink }}>
      <header style={{ display: "flex", alignItems: "flex-start",
        justifyContent: "space-between", gap: 16, marginBottom: 22, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600,
            margin: "0 0 4px", color: C.ink, letterSpacing: "-0.01em" }}>Notifications</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
            Recent activity on your envelopes
          </p>
        </div>
        <button onClick={() => markAllRead()} disabled={unreadCount === 0} style={{
          background: unreadCount === 0 ? "transparent" : C.forest,
          color: unreadCount === 0 ? C.muted : "#fff",
          border: unreadCount === 0 ? `1px solid ${C.border}` : "none",
          padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
          fontSize: 14, fontWeight: 600,
          cursor: unreadCount === 0 ? "default" : "pointer",
        }}>Mark all as read</button>
      </header>

      <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => { setFilterId(f.id); setVisible(PAGE_SIZE); }} style={{
            background: filterId === f.id ? C.forest : "transparent",
            color: filterId === f.id ? "#fff" : C.muted,
            border: filterId === f.id ? "none" : `1px solid ${C.border}`,
            borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 500,
            fontFamily: FONT_SANS, cursor: "pointer",
          }}>{f.label}</button>
        ))}
      </div>

      {loading && <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>}
      {error && (
        <div style={{ padding: 16, background: "#FCEBEB", border: "1px solid #F0B5B5",
          borderRadius: 10, color: "#A32D2D" }}>{error}</div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <EmptyState />
      )}

      {!loading && !error && notifications.length > 0 && filtered.length === 0 && (
        <div style={{ padding: 40, textAlign: "center", background: "#fff",
          border: `1px solid ${C.border}`, borderRadius: 12 }}>
          <p style={{ fontSize: 15, color: C.ink, margin: "0 0 4px", fontWeight: 500 }}>
            {filterId === "unread" ? "You're all caught up." : "Nothing matches this filter."}
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            <Link to="#" onClick={e => { e.preventDefault(); setFilterId("all"); }}
              style={{ color: C.forest, textDecoration: "none", fontWeight: 500 }}>
              Switch to All
            </Link> to see past notifications.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12 }}>
            {slice.map((n, i) => (
              <NotificationRow key={n.id} notification={n} variant="page"
                isLast={i === slice.length - 1} onClick={handleRowClick} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 14, fontSize: 13, color: C.muted }}>
            <span>Showing {slice.length} of {filtered.length}</span>
            {visible < filtered.length && (
              <button onClick={() => setVisible(v => v + PAGE_SIZE)} style={{
                background: "transparent", color: C.forest, border: `1px solid ${C.border}`,
                padding: "8px 16px", borderRadius: 10, fontFamily: FONT_SANS,
                fontSize: 13, fontWeight: 500, cursor: "pointer",
              }}>Load more</button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", background: "#fff",
      border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.forestSoft,
        margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Ic d={I.bell} size={28} color={C.forest} s />
      </div>
      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, color: C.ink,
        margin: "0 0 8px" }}>No notifications yet</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: 0, maxWidth: 380,
        marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        When activity happens on your envelopes, you'll see updates here.
      </p>
    </div>
  );
}
