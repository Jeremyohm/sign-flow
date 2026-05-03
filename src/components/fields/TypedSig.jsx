import { useRef, useEffect, useCallback } from "react";
import { F } from "../../theme";
import { useT } from "../../utils/useThemeColors";
import { Input } from "../ui";

export function TypedSig({ name, setName, onCapture }) {
  const T = useT();
  const cRef = useRef(null);
  const render = useCallback(v => {
    if (!v.trim()) { onCapture(null); return; }
    const c = cRef.current; if (!c) return; c.width = 360; c.height = 120;
    const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 360, 120);
    ctx.fillStyle = T.ink; ctx.font = "40px Caveat, cursive"; ctx.textBaseline = "middle"; ctx.fillText(v, 20, 60);
    onCapture(c.toDataURL("image/jpeg", 0.92));
  }, [onCapture]);
  useEffect(() => { render(name); }, [name, render]);
  return (
    <div>
      <Input value={name} onChange={e => setName(e.target.value)} placeholder="Type your full name" style={{ fontSize: 15 }} />
      <div style={{ marginTop: 10, height: 72, background: T.white, borderRadius: 10,
        border: `1.5px solid ${T.border}`, display: "flex", alignItems: "center", paddingLeft: 20 }}>
        {name.trim() ? <span style={{ fontFamily: F.sig, fontSize: 34, color: T.ink }}>{name}</span>
          : <span style={{ color: T.textDim, fontSize: 13 }}>Preview appears here</span>}
      </div>
      <canvas ref={cRef} style={{ display: "none" }} />
    </div>
  );
}
