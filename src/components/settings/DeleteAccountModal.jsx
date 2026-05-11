import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import * as db from "../../lib/db";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC",
  danger: "#A32D2D", dangerBg: "#FCEBEB",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function DeleteAccountModal({ onClose, notify }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const canDelete = text === "DELETE" && !deleting;

  const submit = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await db.deleteAccount();
      await signOut();
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to delete account");
      setDeleting(false);
    }
  };

  return (
    <div onClick={!deleting ? onClose : undefined} style={{ position: "fixed", inset: 0,
      background: "rgba(15,20,24,0.55)", zIndex: 200, padding: 16,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: 24, width: "100%",
        maxWidth: 460, boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
        fontFamily: FONT_SANS }}>
        <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600,
          color: C.danger, margin: "0 0 10px" }}>Delete account</h3>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.5, margin: "0 0 6px" }}>
          This is permanent. All envelopes, templates, contacts, and notifications
          will be deleted. This cannot be undone.
        </p>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 16px" }}>
          To confirm, type <strong>DELETE</strong> below.
        </p>
        <input type="text" value={text} autoFocus
          onChange={e => setText(e.target.value)}
          placeholder="Type DELETE to confirm"
          onKeyDown={e => { if (e.key === "Enter" && canDelete) submit(); }}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px",
            fontSize: 14, fontFamily: FONT_SANS, border: `1px solid ${C.border}`,
            borderRadius: 10, background: "#fff", color: C.ink }} />
        {error && <p style={{ fontSize: 13, color: C.danger, margin: "12px 0 0" }}>{error}</p>}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button onClick={onClose} disabled={deleting} style={{
            background: "transparent", color: C.ink, border: `1px solid ${C.border}`,
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={submit} disabled={!canDelete} style={{
            background: canDelete ? C.danger : "#D9C8C8", color: "#fff",
            border: "none", padding: "10px 18px", borderRadius: 10,
            fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
            cursor: canDelete ? "pointer" : "not-allowed",
          }}>{deleting ? "Deleting…" : "Delete account"}</button>
        </div>
      </div>
    </div>
  );
}
