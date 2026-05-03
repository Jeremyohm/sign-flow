import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";

export function FilterBar({ options, active, onChange }) {
  const T = useT();
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(f => (
        <button key={f} onClick={() => onChange(f)} style={{
          padding: "5px 12px", borderRadius: 6,
          border: `1px solid ${active === f ? T.accent : T.border}`,
          background: active === f ? T.accentSoft : "transparent",
          color: active === f ? T.accent : T.textSec,
          fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer", textTransform: "capitalize",
        }}>{f === "all" ? "All" : f.replace("_", " ")}</button>
      ))}
    </div>
  );
}
