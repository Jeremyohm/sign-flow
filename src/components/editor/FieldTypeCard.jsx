const C = {
  paper: "#FAFAF7",
  ink: "#0F1418",
  muted: "#5A6168",
  border: "#E0E0DC",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

const ICONS = {
  signature: "M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  initials:  "M4 7V4h16v3M9 20h6M12 4v16",
  date:      "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
  text:      "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6",
};

const LABELS = {
  signature: "Signature",
  initials:  "Initials",
  date:      "Date",
  text:      "Text",
};

export function FieldTypeCard({ type, accentColor, onDragStart, onDragEnd }) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/sf-field-type", type);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart?.(type);
      }}
      onDragEnd={() => onDragEnd?.()}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        padding: "16px 10px",
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        cursor: "grab",
        userSelect: "none",
        boxShadow: `inset 0 -2px 0 ${accentColor}33`,
        transition: "box-shadow 150ms ease, border-color 150ms ease",
        fontFamily: FONT_SANS,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = accentColor; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICONS[type].split(" M").map((seg, i) => (
          <path key={i} d={i === 0 ? seg : "M" + seg} />
        ))}
      </svg>
      <span style={{ fontSize: 12, fontWeight: 600, color: C.ink }}>{LABELS[type]}</span>
    </div>
  );
}

export const FIELD_DEFAULTS = {
  signature: { w: 180, h: 40 },
  initials:  { w: 60,  h: 40 },
  date:      { w: 100, h: 24 },
  text:      { w: 160, h: 24 },
};
