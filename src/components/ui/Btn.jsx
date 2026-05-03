import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";

export function Btn({ children, variant = "primary", size = "md", disabled, onClick, style = {} }) {
  const T = useT();
  const b = { fontFamily: F.body, fontWeight: 600, borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex", alignItems: "center", gap: 6, border: "none", transition: "all 0.15s",
    opacity: disabled ? 0.5 : 1 };
  const sz = { sm: { fontSize: 12, padding: "6px 12px" }, md: { fontSize: 13, padding: "9px 18px" }, lg: { fontSize: 14, padding: "12px 24px" } };
  const v = {
    primary: { background: T.accent, color: T.white },
    secondary: { background: T.surface, color: T.text, border: `1px solid ${T.border}`, boxShadow: T.shadow },
    ghost: { background: "transparent", color: T.textSec },
    danger: { background: T.errorSoft, color: T.error },
    success: { background: T.successSoft, color: T.success },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...b, ...sz[size], ...v[variant], ...style }}>{children}</button>;
}
