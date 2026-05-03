import { useT } from "../../utils/useThemeColors";

export function SectionLabel({ children }) {
  const T = useT();
  return <div style={{ fontSize: 10, fontWeight: 700, color: T.textDim, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>{children}</div>;
}
