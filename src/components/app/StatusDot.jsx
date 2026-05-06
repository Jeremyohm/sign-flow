// Solid circle status indicator. Three variants matching the dashboard's
// status taxonomy: green = action needed / completed, amber = in progress,
// gray = draft (hollow ring instead of filled fill).

const C = {
  green: "#1E5128",
  amber: "#B8860B",
  gray:  "#9CA3A0",
};

export function StatusDot({ variant = "green", size = 8 }) {
  const isHollow = variant === "gray";
  const color = C[variant] || C.green;
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: isHollow ? "transparent" : color,
        border: isHollow ? `1.5px solid ${color}` : "none",
        flexShrink: 0,
      }}
    />
  );
}
