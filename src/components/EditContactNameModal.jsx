import { useState } from "react";

const C = {
  paper: "#FAFAF7", paperWarm: "#F2F2EE", ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", forestDark: "#163E1F", border: "#E0E0DC",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function EditContactNameModal({ contact, onSave, onCancel }) {
  const [name, setName] = useState(contact?.display_name || contact?.derived_name || "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(name.trim() || null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onCancel} style={{
      position: "fixed", inset: 0, background: "rgba(15,20,24,0.55)", zIndex: 200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      backdropFilter: "blur(3px)",
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, padding: 24, width: "100%", maxWidth: 420,
        boxShadow: "0 24px 60px rgba(0,0,0,0.20)", fontFamily: FONT_SANS,
      }}>
        <h3 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: C.ink, margin: "0 0 4px" }}>
          Edit contact name
        </h3>
        <p style={{ fontSize: 13, color: C.muted, margin: "0 0 18px" }}>
          {contact?.email}
        </p>
        <input type="text" value={name} autoFocus
          onChange={e => setName(e.target.value)}
          placeholder="Display name"
          onKeyDown={e => { if (e.key === "Enter") submit(); }}
          style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px",
            fontSize: 14, fontFamily: FONT_SANS, border: `1px solid ${C.border}`,
            borderRadius: 10, background: "#fff", color: C.ink }} />
        <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            background: "transparent", color: C.forest, border: `1px solid ${C.border}`,
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 500, cursor: "pointer",
          }}>Cancel</button>
          <button onClick={submit} disabled={saving} style={{
            background: saving ? "#9AA39C" : C.forest, color: "#fff", border: "none",
            padding: "10px 18px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
          }}>{saving ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
