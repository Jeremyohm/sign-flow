import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const FONT_SANS = "'Inter', system-ui, sans-serif";

function formatTick(iso, bucket) {
  if (!iso) return "";
  const d = new Date(iso);
  if (bucket === "month") {
    return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VolumeChart({ data, bucket }) {
  const safe = Array.isArray(data) ? data : [];
  return (
    <div style={{ background: "#fff", border: "1px solid #E0E0DC", borderRadius: 12,
      padding: 20 }}>
      <h3 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 16, fontWeight: 600,
        color: "#0F1418", margin: "0 0 16px" }}>Envelopes over time</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={safe} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <CartesianGrid stroke="#E0E0DC" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="date" tickFormatter={d => formatTick(d, bucket)}
            axisLine={false} tickLine={false}
            tick={{ fill: "#5A6168", fontSize: 11, fontFamily: FONT_SANS }} />
          <YAxis allowDecimals={false} axisLine={false} tickLine={false}
            tick={{ fill: "#5A6168", fontSize: 11, fontFamily: FONT_SANS }} />
          <Tooltip
            labelFormatter={d => formatTick(d, bucket)}
            contentStyle={{ background: "#fff", border: "1px solid #1E5128",
              borderRadius: 8, fontFamily: FONT_SANS, fontSize: 12,
              boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }} />
          <Legend wrapperStyle={{ fontSize: 12, fontFamily: FONT_SANS, paddingTop: 8 }} />
          <Line type="monotone" dataKey="sent" name="Sent"
            stroke="#1E5128" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="completed" name="Completed"
            stroke="#999999" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
