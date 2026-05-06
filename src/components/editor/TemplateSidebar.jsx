import { useState } from "react";
import { FieldTypeCard } from "./FieldTypeCard";

const C = {
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  paperHover: "#EAEAE6",
  ink: "#0F1418",
  muted: "#5A6168",
  soft: "#8A8A82",
  forest: "#1E5128",
  forestDark: "#163E1F",
  border: "#E0E0DC",
  borderDark: "#B8B6AB",
  errorText: "#A32D2D",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

const FIELD_TYPES = ["signature", "initials", "date", "text"];

// Sidebar variant for the template editor.
// Differences from the envelope sidebar:
//  - "Roles" section instead of "Recipients" — just colored label inputs.
//  - "+ Add role" / per-row delete affordance.
//  - Single "Save Template" footer button (no Send for Signing, no Save as Template).
export function TemplateSidebar({
  templateName,
  pageCount,
  roles,                  // [{ id, label, color }]
  activeRoleId,
  setActiveRoleId,
  onRoleLabelChange,      // (roleId, newLabel) => void
  onAddRole,
  onRemoveRole,
  onMoveRole,             // (fromIdx, toIdx) => void
  onBack,
  onSaveTemplate,
  saving,
  saveDisabled,
  saveDisabledReason,
}) {
  const activeRole = roles.find(r => r.id === activeRoleId) || roles[0];
  const activeColor = activeRole?.color || C.forest;

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: C.paper,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "16px 24px 12px", borderBottom: `1px solid ${C.border}` }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none", padding: 0, cursor: "pointer",
            color: C.muted, fontFamily: FONT_SANS, fontSize: 12, fontWeight: 500,
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.forest; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back to templates
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600,
              color: C.ink, margin: "0 0 4px",
              letterSpacing: "-0.01em", wordBreak: "break-word",
            }}
          >
            {templateName || "New template"}
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {pageCount} {pageCount === 1 ? "page" : "pages"}
          </p>
        </div>

        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Roles</SectionLabel>
          <p style={{ fontSize: 11, color: C.soft, lineHeight: 1.5, margin: "0 0 12px" }}>
            Label the parties who'll sign. No emails — those come later when an envelope is created from this template.
          </p>

          <div>
            {roles.map((r, i) => (
              <RoleRow
                key={r.id}
                role={r}
                index={i}
                isActive={r.id === activeRoleId}
                canRemove={roles.length > 1}
                onClick={() => setActiveRoleId(r.id)}
                onChangeLabel={(label) => onRoleLabelChange(r.id, label)}
                onRemove={() => onRemoveRole(r.id)}
                onDragMove={(toIdx) => onMoveRole(i, toIdx)}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={onAddRole}
            className="ne-add-btn"
            style={{
              width: "100%", padding: 10, marginTop: 8,
              background: "transparent", color: C.muted,
              border: `1px dashed ${C.borderDark}`, borderRadius: 6,
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
              cursor: "pointer",
              transition: "border-color 150ms ease, color 150ms ease, background 150ms ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.forest; e.currentTarget.style.color = C.forest; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.borderDark; e.currentTarget.style.color = C.muted; }}
          >
            + Add role
          </button>
        </div>

        <div>
          <SectionLabel>Drag to place</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {FIELD_TYPES.map(t => (
              <FieldTypeCard key={t} type={t} accentColor={activeColor} />
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: "16px 24px",
          background: C.paperWarm,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <button
          type="button"
          onClick={onSaveTemplate}
          disabled={saveDisabled || saving}
          title={saveDisabled ? saveDisabledReason : ""}
          style={{
            width: "100%",
            padding: "11px 14px",
            background: (saveDisabled || saving) ? "#9CA3A0" : C.forest,
            color: C.paper,
            border: "none",
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.01em",
            cursor: (saveDisabled || saving) ? "not-allowed" : "pointer",
            opacity: saveDisabled ? 0.6 : 1,
            transition: "background 150ms ease",
          }}
          onMouseEnter={(e) => { if (!saveDisabled && !saving) e.currentTarget.style.background = C.forestDark; }}
          onMouseLeave={(e) => { if (!saveDisabled && !saving) e.currentTarget.style.background = C.forest; }}
        >
          {saving ? "Saving…" : "Save Template"}
        </button>
      </div>
    </aside>
  );
}

function RoleRow({ role, index, isActive, canRemove, onClick, onChangeLabel, onRemove, onDragMove }) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/sf-role-idx", String(index)); e.dataTransfer.effectAllowed = "move"; }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("text/sf-role-idx")) {
          e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        const fromIdx = parseInt(e.dataTransfer.getData("text/sf-role-idx"), 10);
        setDragOver(false);
        if (!isNaN(fromIdx) && fromIdx !== index) { e.preventDefault(); onDragMove(index); }
      }}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: dragOver ? C.paperWarm : (isActive ? C.paperWarm : C.paper),
        border: isActive ? `1.5px solid ${role.color}` : `1px solid ${C.border}`,
        borderRadius: 6,
        marginBottom: 6,
        cursor: "pointer",
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{ width: 12, height: 12, borderRadius: "50%", background: role.color, flexShrink: 0 }}
      />
      <input
        type="text"
        value={role.label}
        onChange={(e) => onChangeLabel(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        placeholder={`Role ${index + 1}`}
        maxLength={50}
        style={{
          flex: 1, minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: FONT_SANS,
          fontSize: 13,
          fontWeight: isActive ? 600 : 500,
          color: C.ink,
        }}
      />
      {canRemove && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove role"
          style={{
            background: "transparent", border: "none", padding: 4,
            color: C.soft, cursor: "pointer", flexShrink: 0,
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.errorText; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.soft; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: FONT_SANS, fontSize: 11, fontWeight: 600,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: C.muted, marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
