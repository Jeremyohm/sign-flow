import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const PALETTE = {
  "Completed":      "#1E5128",
  "In progress":    "#D4A017",
  "Voided/expired": "#999999",
  "Draft":          "#C5C5C0",
};
const ORDER = ["Completed", "In progress", "Voided/expired", "Draft"];

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

export function StatusDonut({ data }) {
  const map = new Map((data || []).map(d => [d.category, d.count]));
  const ordered = ORDER
    .map(cat => ({ category: cat, count: map.get(cat) || 0 }))
    .filter(d => d.count > 0);
  const total = ordered.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ background: "#fff", border: "1px solid #E0E0DC", borderRadius: 12,
      padding: 20 }}>
      <h3 style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600,
        color: "#0F1418", margin: "0 0 16px" }}>Current envelope status</h3>
      <div style={{ position: "relative", height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={ordered.length > 0 ? ordered : [{ category: "—", count: 1 }]}
              dataKey="count" nameKey="category"
              innerRadius={62} outerRadius={92} paddingAngle={1}
              strokeWidth={0}>
              {(ordered.length > 0 ? ordered : [{ category: "—" }]).map((entry, i) => (
                <Cell key={i} fill={PALETTE[entry.category] || "#EAEAE6"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div style={{ position: "absolute", inset: 0, display: "flex",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          pointerEvents: "none" }}>
          <div style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 600,
            color: "#0F1418", lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 11, color: "#5A6168", fontFamily: FONT_SANS,
            textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 }}>
            total
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {ORDER.map(cat => {
          const count = map.get(cat) || 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={cat} style={{ display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, fontFamily: FONT_SANS, color: "#0F1418" }}>
              <span style={{ width: 10, height: 10, borderRadius: 2,
                background: PALETTE[cat], flexShrink: 0 }} />
              <span style={{ flex: 1 }}>{cat}</span>
              <span style={{ color: "#5A6168", fontVariantNumeric: "tabular-nums" }}>
                {count} ({pct}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
