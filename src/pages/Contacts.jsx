import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useDocTitle } from "../utils";
import * as db from "../lib/db";
import { ContactRow } from "../components/ContactRow";
import { EditContactNameModal } from "../components/EditContactNameModal";

const C = {
  paper: "#FAFAF7", paperWarm: "#F2F2EE", paperHover: "#EAEAE6",
  ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", forestDark: "#163E1F", forestSoft: "rgba(30,81,40,0.08)",
  border: "#E0E0DC",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";
const PAGE_SIZE = 25;

export function Contacts({ notify }) {
  useDocTitle("Contacts");
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await db.fetchContacts();
        if (!cancelled) setContacts(rows);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load contacts");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(c => {
      const name = (c.display_name || c.derived_name || "").toLowerCase();
      return c.email.toLowerCase().includes(q) || name.includes(q);
    });
  }, [contacts, query]);

  const slice = filtered.slice(0, visible);

  const handleEditSave = async (newName) => {
    try {
      const updated = await db.updateContact(editing.id, { display_name: newName });
      setContacts(prev => prev.map(c => c.id === editing.id
        ? { ...c, display_name: updated.display_name } : c));
      setEditing(null);
      notify?.("Contact updated");
    } catch (err) {
      notify?.(`Update failed: ${err.message}`, "warning");
    }
  };

  const handleHide = async (contact) => {
    if (!window.confirm(`Remove ${contact.display_name || contact.derived_name || contact.email} from contacts? Their envelopes are not affected.`)) return;
    try {
      await db.hideContact(contact.id);
      setContacts(prev => prev.filter(c => c.id !== contact.id));
      notify?.("Contact hidden");
    } catch (err) {
      notify?.(`Failed: ${err.message}`, "warning");
    }
  };

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px",
      fontFamily: FONT_SANS, color: C.ink }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600, margin: "0 0 4px",
            color: C.ink, letterSpacing: "-0.01em" }}>Contacts</h1>
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>People you've sent documents to</p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or email"
            style={{ padding: "10px 14px", fontSize: 14, fontFamily: FONT_SANS,
              border: `1px solid ${C.border}`, borderRadius: 10, background: "#fff",
              color: C.ink, minWidth: 240 }} />
          <button onClick={() => navigate("/new")} style={{
            background: C.forest, color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>+ New envelope</button>
        </div>
      </header>

      {loading && <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>}

      {error && (
        <div style={{ padding: 16, background: "#FCEBEB", border: "1px solid #F0B5B5",
          borderRadius: 10, color: "#A32D2D" }}>{error}</div>
      )}

      {!loading && !error && contacts.length === 0 && (
        <EmptyState onSendFirst={() => navigate("/new")} />
      )}

      {!loading && !error && contacts.length > 0 && (
        <>
          <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
            overflow: "hidden" }}>
            {slice.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted }}>
                No contacts match "{query}"
              </div>
            ) : slice.map(c => (
              <ContactRow key={c.id} contact={c} onEdit={setEditing} onHide={handleHide} />
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
            marginTop: 14, fontSize: 13, color: C.muted }}>
            <span>
              Showing {slice.length} of {filtered.length} contact{filtered.length === 1 ? "" : "s"}
              {query && contacts.length !== filtered.length && ` (filtered from ${contacts.length})`}
            </span>
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

      {editing && (
        <EditContactNameModal contact={editing} onSave={handleEditSave}
          onCancel={() => setEditing(null)} />
      )}
    </div>
  );
}

function EmptyState({ onSendFirst }) {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", background: "#fff",
      border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.forestSoft,
        margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke={C.forest} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      </div>
      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, color: C.ink,
        margin: "0 0 8px" }}>No contacts yet</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", maxWidth: 380,
        marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        When you send an envelope, the recipient will appear here for easy access next time.
      </p>
      <button onClick={onSendFirst} style={{
        background: C.forest, color: "#fff", border: "none",
        padding: "10px 20px", borderRadius: 10, fontFamily: FONT_SANS,
        fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>+ Send your first envelope</button>
    </div>
  );
}
