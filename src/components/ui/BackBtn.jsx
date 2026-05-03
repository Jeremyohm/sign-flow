import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";
import { Ic } from "./Icons";

export function BackBtn({ onClick, label = "Back" }) {
  const T = useT();
  return <button onClick={onClick} style={{ background: "none", border: "none", color: T.textSec,
    cursor: "pointer", display: "flex", alignItems: "center", gap: 4, marginBottom: 20, fontWeight: 600,
    fontFamily: F.body, fontSize: 13, padding: 0 }}>
    <Ic d="M19 12H5 M12 19l-7-7 7-7" size={16} color={T.textSec} s /> {label}
  </button>;
}
