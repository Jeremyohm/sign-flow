import { useState } from "react";
import { useT } from "../../utils/useThemeColors";

export function Card({ children, style = {}, onClick, hover = false }) {
  const T = useT();
  const [h, setH] = useState(false);
  return (
    <div onClick={onClick}
      onMouseEnter={() => hover && setH(true)} onMouseLeave={() => hover && setH(false)}
      style={{
        background: T.surface, borderRadius: 14, border: `1px solid ${h ? T.borderFocus : T.border}`,
        padding: 24, boxShadow: h ? T.shadowMd : T.shadow, transition: "all 0.2s",
        cursor: onClick ? "pointer" : "default", ...style,
      }}>{children}</div>
  );
}
