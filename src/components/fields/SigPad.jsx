import { useState, useRef, useEffect } from "react";
import { useT } from "../../utils/useThemeColors";
import { Btn } from "../ui";

export function SigPad({ onCapture, onClear }) {
  const T = useT();
  const cRef = useRef(null);
  const [dr, setDr] = useState(false);
  const [has, setHas] = useState(false);
  const last = useRef(null);
  useEffect(() => {
    const c = cRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1; const r = c.getBoundingClientRect();
    c.width = r.width * dpr; c.height = r.height * dpr;
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = T.text; ctx.lineWidth = 2;
  }, []);
  const pos = e => { const r = cRef.current.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; };
  const start = e => { e.preventDefault(); setDr(true); last.current = pos(e); };
  const move = e => {
    if (!dr) return; e.preventDefault();
    const ctx = cRef.current.getContext("2d"); const p = pos(e);
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke();
    last.current = p; if (!has) setHas(true);
  };
  const end = () => {
    if (!dr) return; setDr(false); last.current = null;
    if (has) {
      const c = cRef.current; const tmp = document.createElement("canvas"); tmp.width = 360; tmp.height = 120;
      const tc = tmp.getContext("2d"); tc.fillStyle = "#fff"; tc.fillRect(0, 0, 360, 120);
      tc.drawImage(c, 0, 0, 360, 120); onCapture(tmp.toDataURL("image/jpeg", 0.92));
    }
  };
  const clear = () => {
    const c = cRef.current; const ctx = c.getContext("2d"); const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, c.width / dpr, c.height / dpr); setHas(false); onClear();
  };
  return (
    <div>
      <canvas ref={cRef} style={{ width: "100%", height: 140, background: T.white, borderRadius: 10,
        border: `1.5px solid ${T.border}`, cursor: "crosshair", touchAction: "none" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
        <span style={{ fontSize: 11, color: T.textDim }}>Draw your signature above</span>
        {has && <Btn variant="danger" size="sm" onClick={clear}>Clear</Btn>}
      </div>
    </div>
  );
}
