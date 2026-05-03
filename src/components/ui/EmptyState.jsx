import { useT } from "../../utils/useThemeColors";
import { Ic } from "./Icons";

export function EmptyState({ icon, message }) {
  const T = useT();
  return (
    <div style={{ padding: 48, textAlign: "center" }}>
      {icon && <Ic d={icon} size={36} color={T.textDim} s />}
      <p style={{ color: T.textDim, fontSize: 14, marginTop: icon ? 12 : 0 }}>{message}</p>
    </div>
  );
}
