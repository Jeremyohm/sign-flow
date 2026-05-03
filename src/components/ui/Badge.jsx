import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";

export function Badge({ children, color, bg }) {
  const T = useT();
  if (!color) color = T.accent;
  return <span style={{ fontSize: 10, fontWeight: 700, fontFamily: F.body, letterSpacing: 0.5,
    background: bg || `${color}12`, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase",
    color }}>{children}</span>;
}
