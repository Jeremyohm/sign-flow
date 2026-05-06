const C = {
  paper: "#FAFAF7",
  ink: "#0F1418",
  muted: "#5A6168",
  forest: "#1E5128",
  border: "#E0E0DC",
  errorText: "#A32D2D",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function CanvasToolbar({ zoom, setZoom, onFitWidth, onFitPage, saveStatus }) {
  const idx = ZOOM_LEVELS.findIndex(z => Math.abs(z - zoom) < 0.001);
  const canZoomOut = idx > 0;
  const canZoomIn  = idx === -1 || idx < ZOOM_LEVELS.length - 1;

  function zoomOut() {
    if (idx === -1) {
      // arbitrary zoom (e.g. fit-width) → snap to next lower preset
      const next = [...ZOOM_LEVELS].reverse().find(z => z < zoom) ?? ZOOM_LEVELS[0];
      setZoom(next);
    } else if (canZoomOut) setZoom(ZOOM_LEVELS[idx - 1]);
  }
  function zoomIn() {
    if (idx === -1) {
      const next = ZOOM_LEVELS.find(z => z > zoom) ?? ZOOM_LEVELS[ZOOM_LEVELS.length - 1];
      setZoom(next);
    } else if (canZoomIn) setZoom(ZOOM_LEVELS[idx + 1]);
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        padding: "8px 12px",
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        fontFamily: FONT_SANS,
      }}
    >
      <ToolbarBtn onClick={zoomOut} disabled={!canZoomOut} title="Zoom out">−</ToolbarBtn>
      <span
        style={{
          fontSize: 12,
          fontVariantNumeric: "tabular-nums",
          color: C.ink,
          fontWeight: 600,
          minWidth: 44,
          textAlign: "center",
        }}
      >
        {Math.round(zoom * 100)}%
      </span>
      <ToolbarBtn onClick={zoomIn} disabled={!canZoomIn} title="Zoom in">+</ToolbarBtn>

      <span style={{ width: 1, height: 20, background: C.border, margin: "0 6px" }} />

      <ToolbarBtn onClick={onFitWidth} title="Fit to width">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 12h18" />
          <path d="M7 8l-4 4 4 4" />
          <path d="M17 8l4 4-4 4" />
        </svg>
      </ToolbarBtn>
      <ToolbarBtn onClick={onFitPage} title="Fit to page">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 00-2 2v3" />
          <path d="M21 8V5a2 2 0 00-2-2h-3" />
          <path d="M3 16v3a2 2 0 002 2h3" />
          <path d="M16 21h3a2 2 0 002-2v-3" />
        </svg>
      </ToolbarBtn>

      <span style={{ width: 1, height: 20, background: C.border, margin: "0 6px" }} />

      <SaveIndicator status={saveStatus} />
    </div>
  );
}

function ToolbarBtn({ onClick, disabled, title, children }) {
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
        border: "none",
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        color: disabled ? "#9CA3A0" : C.ink,
        fontFamily: FONT_SANS,
        fontSize: 16, fontWeight: 600,
        opacity: disabled ? 0.5 : 1,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = "#F2F2EE"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function SaveIndicator({ status }) {
  // status: "idle" | "saving" | "saved" | "failed"
  let label = "All changes saved";
  let color = C.muted;
  if (status === "saving") { label = "Saving…"; color = C.muted; }
  else if (status === "saved") { label = "Saved"; color = C.forest; }
  else if (status === "failed") { label = "Couldn't save — retrying…"; color = C.errorText; }

  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 500,
        color,
        minWidth: 100,
        textAlign: "left",
        transition: "color 200ms ease",
      }}
    >
      {label}
    </span>
  );
}
