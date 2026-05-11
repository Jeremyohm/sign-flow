const C = {
  paper: "#FAFAF7", border: "#E0E0DC",
  ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", danger: "#A32D2D",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function StatCard({ label, value, trend }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "18px 20px" }}>
      <div style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 600,
        color: C.ink, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.muted, fontFamily: FONT_SANS,
        textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8 }}>
        {label}
      </div>
      {trend && (
        <div style={{ marginTop: 10, fontSize: 12, fontFamily: FONT_SANS,
          color: trend.direction === "up" ? C.forest
               : trend.direction === "down" ? C.danger
               : C.muted, fontWeight: 500 }}>
          {trend.direction === "up" ? "↑" : trend.direction === "down" ? "↓" : "·"} {trend.label}
        </div>
      )}
    </div>
  );
}

export function trendFrom(curr, prev) {
  if (prev == null || prev === 0) return null;
  if (curr == null) return null;
  const delta = ((curr - prev) / prev) * 100;
  if (Math.abs(delta) < 0.5) return { direction: "flat", label: "no change vs. previous period" };
  return {
    direction: delta > 0 ? "up" : "down",
    label: `${Math.abs(delta).toFixed(0)}% vs. previous period`,
  };
}

// Inverted trend (lower is better, e.g. avg time to sign)
export function trendFromInverted(curr, prev) {
  if (prev == null || prev === 0) return null;
  if (curr == null) return null;
  const delta = ((curr - prev) / prev) * 100;
  if (Math.abs(delta) < 0.5) return { direction: "flat", label: "no change vs. previous period" };
  return {
    direction: delta < 0 ? "up" : "down",
    label: `${Math.abs(delta).toFixed(0)}% ${delta < 0 ? "faster" : "slower"} vs. previous period`,
  };
}

export function formatDuration(seconds) {
  if (seconds == null || !isFinite(seconds)) return "—";
  const s = Math.round(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  if (h < 24) return mm ? `${h}h ${mm}m` : `${h}h`;
  const d = Math.floor(h / 24);
  const hh = h % 24;
  return hh ? `${d}d ${hh}h` : `${d}d`;
}
