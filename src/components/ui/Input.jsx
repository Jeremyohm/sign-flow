import { useState } from "react";
import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";

export function Input({ value, onChange, placeholder, size = "md", style = {}, ...rest }) {
  const T = useT();
  const [focused, setFocused] = useState(false);
  const sz = size === "sm"
    ? { padding: "8px 10px", fontSize: 12, borderRadius: 8 }
    : { padding: "11px 14px", fontSize: 14, borderRadius: 10 };
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      onFocus={e => { setFocused(true); rest.onFocus?.(e); }}
      onBlur={e => { setFocused(false); rest.onBlur?.(e); }}
      style={{
        width: "100%", boxSizing: "border-box", background: T.surfaceAlt,
        border: `1.5px solid ${focused ? T.borderFocus : T.border}`,
        color: T.text, fontFamily: F.body, outline: "none",
        ...sz, ...style,
      }}
      {...rest}
    />
  );
}
