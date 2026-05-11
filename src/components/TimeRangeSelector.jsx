const OPTIONS = [
  { label: "Last 7 days", value: 7 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 12 months", value: 365 },
  { label: "All time", value: "all" },
];

export function TimeRangeSelector({ value, onChange }) {
  const v = value == null ? "all" : String(value);
  return (
    <select
      value={v}
      onChange={e => {
        const raw = e.target.value;
        onChange(raw === "all" ? null : Number(raw));
      }}
      style={{
        padding: "8px 32px 8px 14px",
        fontSize: 13, fontFamily: "'Inter', system-ui, sans-serif",
        background: "#fff", color: "#0F1418",
        border: "1px solid #E0E0DC", borderRadius: 10,
        cursor: "pointer", outline: "none",
        appearance: "none",
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%235A6168' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}>
      {OPTIONS.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}
