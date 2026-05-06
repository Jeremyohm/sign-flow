import { useState } from "react";

const C = {
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  ink: "#0F1418",
  muted: "#5A6168",
  soft: "#8A8A82",
  forest: "#1E5128",
  forestDark: "#163E1F",
  border: "#E0E0DC",
  errorText: "#A32D2D",
  errorBg: "#FCEBEB",
  errorBorder: "#F0B5B5",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

// Modal for saving the current envelope as a reusable template.
// Pre-fills role names from existing signers ("Signer 1", "Signer 2", ...)
// and lets the user rename them ("Landlord", "Tenant").
//
// Props:
//   signers: [{ id, name }]  — signer-type recipients on the source envelope
//   onCancel: () => void
//   onSave: ({ name, description, roles }) => Promise<void>  — caller does the
//           actual storage copy + DB insert + role/field mapping
export function SaveTemplateModal({ signers, onCancel, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [roles, setRoles] = useState(
    signers.map((_s, i) => `Signer ${i + 1}`),
  );
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  function setRoleAt(i, value) {
    setRoles(rs => rs.map((r, idx) => (idx === i ? value : r)));
  }

  function validate() {
    if (!name.trim()) return "Template name is required.";
    if (name.length > 100) return "Template name is too long (max 100 characters).";
    if (description.length > 500) return "Description is too long (max 500 characters).";
    if (roles.some(r => !r.trim())) return "Each role needs a name.";
    if (roles.some(r => r.length > 50)) return "Role names should be under 50 characters.";
    const lower = roles.map(r => r.trim().toLowerCase());
    if (new Set(lower).size !== lower.length) return "Role names must be unique.";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        description: description.trim(),
        roles: roles.map(r => r.trim()),
      });
    } catch (e) {
      setError(e?.message || "Couldn't save template. Try again.");
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15, 20, 24, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="save-tmpl-title"
        style={{
          background: C.paper,
          borderRadius: 8,
          width: "100%", maxWidth: 520,
          boxShadow: "0 16px 48px rgba(15, 20, 24, 0.18)",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "24px 28px 8px" }}>
          <h2
            id="save-tmpl-title"
            style={{
              fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600,
              color: C.ink, margin: "0 0 6px", letterSpacing: "-0.01em",
            }}
          >
            Save as Template
          </h2>
          <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
            Name this template and give meaningful labels to the signing roles. The fields
            you've placed will be saved with their role assignments.
          </p>
        </div>

        <div style={{ padding: "0 28px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <Field label="Template name" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Lease Agreement Template"
              style={inputStyle()}
              maxLength={100}
              autoFocus
            />
          </Field>

          <Field label="Description" optional>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this template is for"
              rows={2}
              style={{ ...inputStyle(), resize: "vertical", lineHeight: 1.5 }}
              maxLength={500}
            />
          </Field>

          <Field label="Role names" required>
            <p style={{ fontSize: 12, color: C.soft, margin: "0 0 8px" }}>
              Rename "Signer N" to something meaningful (e.g. "Landlord", "Tenant").
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roles.map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span
                    style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: C.forest, color: C.paper,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 600, flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={r}
                    onChange={(e) => setRoleAt(i, e.target.value)}
                    placeholder={`Role ${i + 1}`}
                    style={{ ...inputStyle(), flex: 1 }}
                    maxLength={50}
                  />
                  <span
                    style={{ fontSize: 11, color: C.soft, fontStyle: "italic", flexShrink: 0 }}
                    title={signers[i]?.name || ""}
                  >
                    was {signers[i]?.name || "(unnamed)"}
                  </span>
                </div>
              ))}
            </div>
          </Field>

          {error && (
            <div
              style={{
                padding: "10px 12px", fontSize: 13,
                color: C.errorText, background: C.errorBg,
                border: `1px solid ${C.errorBorder}`, borderRadius: 6,
              }}
            >
              {error}
            </div>
          )}
        </div>

        <div
          style={{
            padding: "16px 28px",
            background: C.paperWarm,
            borderTop: `1px solid ${C.border}`,
            display: "flex", justifyContent: "flex-end", gap: 10,
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              padding: "9px 16px",
              background: "transparent",
              color: C.ink,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 18px",
              background: saving ? C.forestDark : C.forest,
              color: C.paper,
              border: "none",
              borderRadius: 6,
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, optional, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 11, fontWeight: 600, color: C.muted,
            letterSpacing: "0.08em", textTransform: "uppercase",
          }}
        >
          {label}
        </span>
        {required && <span style={{ fontSize: 11, color: C.forest, fontWeight: 600 }}>*</span>}
        {optional && (
          <span
            style={{
              fontSize: 10, fontWeight: 600, color: C.soft,
              letterSpacing: "0.04em", textTransform: "uppercase",
              padding: "2px 6px", background: C.paperWarm, borderRadius: 4,
            }}
          >
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function inputStyle() {
  return {
    width: "100%", boxSizing: "border-box",
    padding: "9px 11px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    background: "#FFFFFF",
    fontSize: 13,
    color: C.ink,
    outline: "none",
    fontFamily: FONT_SANS,
  };
}
