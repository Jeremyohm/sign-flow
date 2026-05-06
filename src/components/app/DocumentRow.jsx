import { StatusDot } from "./StatusDot";

const C = {
  paperWarm: "#F2F2EE",
  ink:       "#0F1418",
  muted:     "#5A6168",
  forest:    "#1E5128",
  border:    "#E0E0DC",
};

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

// One row inside a Zone. Click handler runs on the whole row;
// the action label on the right is decorative (the row itself is the affordance).
export function DocumentRow({
  status = "green",
  name,
  subline,
  actionLabel = "View →",
  onClick,
  isLast = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="lp-doc-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        width: "100%",
        padding: "14px 12px",
        background: "transparent",
        border: "none",
        borderBottom: isLast ? "none" : `1px solid ${C.border}`,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT_SANS,
        transition: "background 150ms ease",
      }}
    >
      <StatusDot variant={status} size={8} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 16,
            fontWeight: 600,
            color: C.ink,
            letterSpacing: "-0.005em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginBottom: 2,
          }}
        >
          {name}
        </div>
        {subline && (
          <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>
            {subline}
          </div>
        )}
      </div>
      <span
        className="lp-doc-row-action"
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: C.forest,
          flexShrink: 0,
          transition: "transform 150ms ease",
          display: "inline-block",
        }}
      >
        {actionLabel}
      </span>
    </button>
  );
}
