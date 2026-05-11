import { useState } from "react";
import { useAuth } from "../../lib/AuthContext";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC",
  forest: "#1E5128", danger: "#A32D2D",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function ChangePasswordModal({ onClose, notify }) {
  const { updatePassword } = useAuth();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    if (pwd.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pwd !== confirm) { setError("Passwords don't match."); return; }
    setSaving(true);
    try {
      const { error: e } = await updatePassword(pwd);
      if (e) throw e;
      notify?.("Password updated");
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell onClose={!saving ? onClose : undefined}>
      <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600,
        color: C.ink, margin: "0 0 16px" }}>Change password</h3>
      <label style={{ display: "block", fontSize: 12, color: C.muted,
        fontFamily: FONT_SANS, marginBottom: 6 }}>New password</label>
      <input type="password" value={pwd} autoFocus
        onChange={e => setPwd(e.target.value)}
        style={inputStyle} />
      <label style={{ display: "block", fontSize: 12, color: C.muted,
        fontFamily: FONT_SANS, margin: "14px 0 6px" }}>Confirm new password</label>
      <input type="password" value={confirm}
        onChange={e => setConfirm(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter") submit(); }}
        style={inputStyle} />
      {error && <p style={{ fontSize: 13, color: C.danger, margin: "12px 0 0" }}>{error}</p>}
      <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
        <button onClick={onClose} disabled={saving} style={secondaryBtn}>Cancel</button>
        <button onClick={submit} disabled={saving} style={primaryBtn(saving)}>
          {saving ? "Updating…" : "Update password"}
        </button>
      </div>
    </ModalShell>
  );
}

const inputStyle = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px",
  fontSize: 14, fontFamily: FONT_SANS, border: `1px solid ${C.border}`,
  borderRadius: 10, background: "#fff", color: C.ink,
};
const secondaryBtn = {
  background: "transparent", color: C.forest, border: `1px solid ${C.border}`,
  padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
  fontSize: 14, fontWeight: 500, cursor: "pointer",
};
const primaryBtn = (disabled) => ({
  background: disabled ? "#9AA39C" : C.forest, color: "#fff", border: "none",
  padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
  fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
});

function ModalShell({ children, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0,
      background: "rgba(15,20,24,0.55)", zIndex: 200, padding: 16,
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: 24, width: "100%",
        maxWidth: 420, boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
        fontFamily: FONT_SANS }}>
        {children}
      </div>
    </div>
  );
}
