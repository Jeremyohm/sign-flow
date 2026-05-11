import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDocTitle } from "../utils";
import * as db from "../lib/db";
import { ContactAvatar } from "../components/ContactAvatar";

const C = {
  paper: "#FAFAF7", paperWarm: "#F2F2EE", paperHover: "#EAEAE6",
  ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", forestDark: "#163E1F", forestSoft: "rgba(30,81,40,0.08)",
  border: "#E0E0DC",
  green: "#3D7A4A", amber: "#C4841D", gray: "#9AA39C",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

function statusColor(envelopeStatus, signerStatus) {
  if (envelopeStatus === "completed" || signerStatus === "signed") return C.green;
  if (envelopeStatus === "voided" || envelopeStatus === "expired") return C.gray;
  return C.amber;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ContactDetail({ notify }) {
  useDocTitle("Contact");
  const { contactId } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await db.fetchContactDetail(contactId);
        if (!c) {
          setError("Contact not found");
          return;
        }
        if (!cancelled) setContact(c);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load contact");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [contactId]);

  const displayName = contact?.display_name || (contact?.email ? contact.email.split("@")[0] : "") || contact?.email || "";
  const envelopes = contact?.envelopes || [];
  const completed = envelopes.filter(e => e.envelope_status === "completed" || e.signer_status === "signed").length;
  const pending = envelopes.filter(e => ["sent", "pending", "in_progress"].includes(e.envelope_status)
    || e.signer_status === "pending").length;
  const lastActivity = envelopes.reduce((acc, e) => {
    const ts = e.envelope_updated_at || e.envelope_created_at;
    return !acc || (ts && ts > acc) ? ts : acc;
  }, null);

  const beginEdit = () => { setDraftName(contact?.display_name || ""); setEditing(true); };
  const cancelEdit = () => { setEditing(false); setDraftName(""); };
  const saveEdit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await db.updateContact(contactId, { display_name: draftName.trim() || null });
      setContact(prev => ({ ...prev, display_name: updated.display_name }));
      setEditing(false);
      notify?.("Contact updated");
    } catch (err) {
      notify?.(`Update failed: ${err.message}`, "warning");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>;
  if (error || !contact) return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px", fontFamily: FONT_SANS }}>
      <Link to="/contacts" style={{ color: C.forest, fontSize: 13, textDecoration: "none" }}>← Back to contacts</Link>
      <div style={{ marginTop: 16, padding: 24, background: "#FCEBEB",
        border: "1px solid #F0B5B5", borderRadius: 10, color: "#A32D2D" }}>
        {error || "Contact not found."}
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 24px",
      fontFamily: FONT_SANS, color: C.ink }}>
      <nav style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
        <Link to="/contacts" style={{ color: C.muted, textDecoration: "none" }}>Contacts</Link>
        <span style={{ margin: "0 6px" }}>›</span>
        <span>{displayName}</span>
      </nav>

      <header style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28,
        flexWrap: "wrap" }}>
        <ContactAvatar name={displayName} email={contact.email} size={60} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input type="text" value={draftName} autoFocus
                onChange={e => setDraftName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
                style={{ flex: 1, padding: "8px 12px", fontSize: 22, fontFamily: FONT_SERIF,
                  fontWeight: 600, border: `1px solid ${C.border}`, borderRadius: 8,
                  background: "#fff", color: C.ink, minWidth: 200 }} />
              <button onClick={saveEdit} disabled={saving} style={{
                background: C.forest, color: "#fff", border: "none",
                padding: "8px 14px", borderRadius: 8, fontFamily: FONT_SANS,
                fontSize: 13, fontWeight: 600, cursor: saving ? "wait" : "pointer",
              }}>{saving ? "…" : "Save"}</button>
              <button onClick={cancelEdit} style={{
                background: "transparent", color: C.muted, border: "none",
                padding: "8px 12px", fontFamily: FONT_SANS, fontSize: 13, cursor: "pointer",
              }}>Cancel</button>
            </div>
          ) : (
            <h1 onClick={beginEdit} title="Click to edit"
              style={{ fontFamily: FONT_SERIF, fontSize: 28, fontWeight: 600,
                margin: "0 0 4px", color: C.ink, cursor: "pointer",
                letterSpacing: "-0.01em" }}>{displayName}</h1>
          )}
          <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>{contact.email}</p>
        </div>
        <button onClick={() => navigate(`/new?contact=${contactId}`)} style={{
          background: C.forest, color: "#fff", border: "none",
          padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>+ New envelope to {displayName.split(" ")[0] || "them"}</button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
        gap: 12, marginBottom: 28 }}>
        <StatTile label="Total" value={envelopes.length} />
        <StatTile label="Completed" value={completed} />
        <StatTile label="Pending" value={pending} />
        <StatTile label="Last activity" value={timeAgo(lastActivity)} small />
      </div>

      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: C.ink,
        margin: "0 0 12px" }}>Envelopes</h2>

      {envelopes.length === 0 ? (
        <div style={{ padding: 24, background: "#fff", border: `1px solid ${C.border}`,
          borderRadius: 12, color: C.muted, textAlign: "center", fontSize: 14 }}>
          No envelopes yet.
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
          overflow: "hidden" }}>
          {envelopes.map((env, idx) => (
            <EnvelopeRow key={env.envelope_id} env={env}
              isLast={idx === envelopes.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, small }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10,
      padding: "14px 16px" }}>
      <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase",
        letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: small ? 14 : 22, fontWeight: 600, color: C.ink,
        fontFamily: small ? FONT_SANS : FONT_SERIF }}>{value}</div>
    </div>
  );
}

function EnvelopeRow({ env, isLast }) {
  const dotColor = statusColor(env.envelope_status, env.signer_status);
  const date = env.envelope_updated_at || env.envelope_created_at;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
      borderBottom: isLast ? "none" : `1px solid ${C.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor,
        flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.ink, fontFamily: FONT_SANS,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {env.envelope_name || "Untitled envelope"}
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontFamily: FONT_SANS }}>
          {timeAgo(date)} · {env.envelope_status}
        </div>
      </div>
      <Link to={`/envelope/${env.envelope_id}`} style={{
        color: C.forest, fontSize: 13, fontWeight: 500, fontFamily: FONT_SANS,
        textDecoration: "none", padding: "6px 12px", borderRadius: 8,
        border: `1px solid ${C.border}`,
      }}>View</Link>
    </div>
  );
}
