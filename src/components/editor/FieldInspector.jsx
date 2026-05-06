import { useState } from "react";

const C = {
  paper: "#FAFAF7",
  ink: "#0F1418",
  muted: "#5A6168",
  border: "#E0E0DC",
  errorText: "#A32D2D",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

// Floating toolbar above a selected field. position is { left, top } in
// screen-space, computed by the canvas.
export function FieldInspector({ position, recipients, onReassign, onDelete, onDuplicate }) {
  const [reassignOpen, setReassignOpen] = useState(false);

  return (
    <div
      role="toolbar"
      style={{
        position: "absolute",
        left: position.left,
        top: position.top,
        transform: "translate(-50%, -100%)",
        marginTop: -8,
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        boxShadow: "0 4px 12px rgba(15,20,24,0.08)",
        padding: 4,
        display: "inline-flex",
        gap: 2,
        fontFamily: FONT_SANS,
        zIndex: 30,
        whiteSpace: "nowrap",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={() => setReassignOpen(o => !o)}
          style={btnStyle()}
          title="Reassign to a different recipient"
        >
          Reassign
        </button>
        {reassignOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              minWidth: 200,
              background: C.paper,
              border: `1px solid ${C.border}`,
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(15,20,24,0.08)",
              padding: 4,
              zIndex: 31,
            }}
          >
            {recipients.map(r => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setReassignOpen(false); onReassign(r.id); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  padding: "8px 10px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                  textAlign: "left",
                  fontFamily: FONT_SANS,
                  fontSize: 12,
                  color: C.ink,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#F2F2EE"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: r.color, flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name || r.email || "(unnamed)"}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" onClick={onDuplicate} style={btnStyle()} title="Duplicate field">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      </button>

      <button type="button" onClick={onDelete} style={{ ...btnStyle(), color: C.errorText }} title="Delete field">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        </svg>
      </button>
    </div>
  );
}

function btnStyle() {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: "6px 10px",
    background: "transparent",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontFamily: "'Inter', system-ui, sans-serif",
    fontSize: 12,
    fontWeight: 500,
    color: "#0F1418",
  };
}
