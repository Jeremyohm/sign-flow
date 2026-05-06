const C = {
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  ink: "#0F1418",
  muted: "#5A6168",
  border: "#E0E0DC",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function RecipientCard({ recipient, color, fieldCount, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: "100%",
        padding: "10px 12px",
        background: isActive ? C.paperWarm : C.paper,
        border: isActive ? `1.5px solid ${color}` : `1px solid ${C.border}`,
        borderRadius: 6,
        cursor: "pointer",
        textAlign: "left",
        fontFamily: FONT_SANS,
        marginBottom: 6,
        transition: "background 150ms ease, border-color 150ms ease",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 12, height: 12, borderRadius: "50%",
          background: color, flexShrink: 0,
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: 13,
            fontWeight: 600,
            color: C.ink,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {recipient.name || "(no name)"}
        </span>
        <span
          style={{
            display: "block",
            fontSize: 11,
            color: C.muted,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {recipient.email || "(no email)"}
        </span>
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: fieldCount > 0 ? color : C.muted,
          flexShrink: 0,
          padding: "2px 6px",
          borderRadius: 4,
          background: fieldCount > 0 ? `${color}14` : "transparent",
        }}
      >
        {fieldCount} {fieldCount === 1 ? "field" : "fields"}
      </span>
    </button>
  );
}
