import { useEffect } from "react";

const C = {
  paper: "#FAFAF7",
  ink: "#0F1418",
  muted: "#5A6168",
  border: "#E0E0DC",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function PageNavigation({ current, total, onChange }) {
  // Keyboard shortcuts (gated on focused-input check so typing in form fields
  // doesn't change pages).
  useEffect(() => {
    function isFormElement(el) {
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }
    function onKey(e) {
      if (isFormElement(document.activeElement)) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        if (current > 0) { e.preventDefault(); onChange(current - 1); }
      } else if (e.key === "ArrowRight" || e.key === "PageDown") {
        if (current < total - 1) { e.preventDefault(); onChange(current + 1); }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, total, onChange]);

  const atFirst = current === 0;
  const atLast  = current >= total - 1;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 16px",
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontFamily: FONT_SANS,
      }}
    >
      <NavBtn onClick={() => onChange(current - 1)} disabled={atFirst} title="Previous page (←)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </NavBtn>

      <span style={{ fontSize: 12, color: C.ink, fontVariantNumeric: "tabular-nums", fontWeight: 500 }}>
        Page <strong>{current + 1}</strong> of {total}
      </span>

      <select
        value={current}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        style={{
          fontFamily: FONT_SANS,
          fontSize: 12,
          padding: "4px 8px",
          border: `1px solid ${C.border}`,
          borderRadius: 4,
          background: C.paper,
          color: C.muted,
          cursor: "pointer",
        }}
        title="Jump to page"
      >
        {Array.from({ length: total }, (_, i) => (
          <option key={i} value={i}>Go to page {i + 1}</option>
        ))}
      </select>

      <NavBtn onClick={() => onChange(current + 1)} disabled={atLast} title="Next page (→)">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </NavBtn>
    </div>
  );
}

function NavBtn({ onClick, disabled, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 28, height: 28,
        background: "transparent",
        border: `1px solid ${C.border}`,
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#9CA3A0" : C.ink,
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#F2F2EE"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}
