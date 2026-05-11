import { useState } from "react";
import { useAuth } from "../../lib/AuthContext";
import * as db from "../../lib/db";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { DeleteAccountModal } from "./DeleteAccountModal";

const C = {
  ink: "#0F1418", muted: "#5A6168", border: "#E0E0DC",
  forest: "#1E5128", danger: "#A32D2D",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

const card = {
  background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12,
  padding: 24, marginBottom: 20,
};
const sectionH = {
  fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: C.ink,
  margin: "0 0 14px",
};
const label = {
  display: "block", fontSize: 12, color: C.muted, fontFamily: FONT_SANS,
  textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6,
};
const input = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px",
  fontSize: 14, fontFamily: FONT_SANS, border: `1px solid ${C.border}`,
  borderRadius: 10, background: "#fff", color: C.ink,
};
const inputRO = { ...input, background: "#F2F2EE", color: C.muted };

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US",
    { year: "numeric", month: "long", day: "numeric" });
}

export function ProfileTab({ notify }) {
  const { user } = useAuth();
  const initialName = user?.user_metadata?.display_name
    ?? (user?.email ? user.email.split("@")[0] : "");
  const [name, setName] = useState(initialName);
  const [saved, setSaved] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showDel, setShowDel] = useState(false);

  const dirty = name.trim() !== saved.trim();

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    try {
      await db.updateDisplayName(name.trim());
      setSaved(name.trim());
      notify?.("Profile updated");
    } catch (err) {
      notify?.(`Failed: ${err.message}`, "warning");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Account */}
      <div style={card}>
        <h2 style={sectionH}>Account</h2>
        <label style={label}>Display name</label>
        <input style={input} value={name} onChange={e => setName(e.target.value)}
          placeholder="Your name" />
        <label style={{ ...label, marginTop: 16 }}>Email</label>
        <input style={inputRO} value={user?.email || ""} readOnly />
        <p style={{ fontSize: 12, color: C.muted, margin: "6px 0 0" }}>
          To change your email, contact support.
        </p>
        <label style={{ ...label, marginTop: 16 }}>Account created</label>
        <p style={{ fontSize: 14, color: C.ink, fontFamily: FONT_SANS,
          margin: 0 }}>{formatDate(user?.created_at)}</p>
        <div style={{ marginTop: 18, display: "flex", justifyContent: "flex-end" }}>
          <button onClick={save} disabled={!dirty || saving} style={{
            background: !dirty ? "#CFD3CC" : C.forest, color: "#fff",
            border: "none", padding: "10px 18px", borderRadius: 10,
            fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
            cursor: !dirty ? "default" : "pointer",
          }}>{saving ? "Saving…" : "Save changes"}</button>
        </div>
      </div>

      {/* Password */}
      <div style={card}>
        <h2 style={sectionH}>Password</h2>
        <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, margin: "0 0 14px" }}>
          Choose a strong password and don't reuse it for other accounts.
        </p>
        <button onClick={() => setShowPwd(true)} style={{
          background: "transparent", color: C.forest, border: `1px solid ${C.border}`,
          padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
          fontSize: 14, fontWeight: 500, cursor: "pointer",
        }}>Change password</button>
      </div>

      {/* Danger zone */}
      <div style={{ ...card, borderColor: "#F0B5B5" }}>
        <h2 style={{ ...sectionH, color: C.danger }}>Danger zone</h2>
        <p style={{ fontSize: 14, color: C.ink, lineHeight: 1.5, margin: "0 0 14px" }}>
          Deleting your account is permanent. All envelopes, templates, and
          contacts will be deleted.
        </p>
        <button onClick={() => setShowDel(true)} style={{
          background: "transparent", color: C.danger, border: `1px solid ${C.danger}`,
          padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}>Delete account</button>
      </div>

      {showPwd && <ChangePasswordModal onClose={() => setShowPwd(false)} notify={notify} />}
      {showDel && <DeleteAccountModal onClose={() => setShowDel(false)} notify={notify} />}
    </div>
  );
}
