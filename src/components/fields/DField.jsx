import { F, FTYPES } from "../../theme";
import { useT } from "../../utils/useThemeColors";

export function DField({ field, scale, onMove, onResize, onDelete, selected, onSelect, signerColor }) {
  const T = useT();
  const ftype = FTYPES.find(f => f.id === field.type);
  const bc = signerColor || ftype.color;
  const drag = e => {
    e.stopPropagation(); onSelect(field.id);
    const sx = (e.touches ? e.touches[0] : e).clientX, sy = (e.touches ? e.touches[0] : e).clientY;
    const ox = field.x, oy = field.y;
    const mv = ev => { const cx = (ev.touches ? ev.touches[0] : ev).clientX, cy = (ev.touches ? ev.touches[0] : ev).clientY;
      onMove(field.id, ox + (cx - sx) / scale, oy + (cy - sy) / scale); };
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv); window.addEventListener("touchend", up);
  };
  const rs = e => {
    e.stopPropagation();
    const sx = (e.touches ? e.touches[0] : e).clientX, sy = (e.touches ? e.touches[0] : e).clientY;
    const ow = field.w, oh = field.h;
    const mv = ev => { const cx = (ev.touches ? ev.touches[0] : ev).clientX, cy = (ev.touches ? ev.touches[0] : ev).clientY;
      onResize(field.id, Math.max(50, ow + (cx - sx) / scale), Math.max(24, oh + (cy - sy) / scale)); };
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", mv); window.removeEventListener("touchend", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", mv); window.addEventListener("touchend", up);
  };
  return (
    <div onMouseDown={drag} onTouchStart={drag} onClick={e => { e.stopPropagation(); onSelect(field.id); }}
      style={{ position: "absolute", left: field.x * scale, top: field.y * scale, width: field.w * scale, height: field.h * scale,
        border: `2px ${selected ? "solid" : "dashed"} ${bc}`, borderRadius: 6, background: `${bc}12`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 4, color: bc,
        fontSize: 11 * Math.max(scale, 0.7), fontFamily: F.body, fontWeight: 600, userSelect: "none",
        zIndex: selected ? 10 : 1, boxShadow: selected ? `0 0 0 1px ${bc}, 0 2px 8px ${bc}22` : "none",
        cursor: "grab", transition: "box-shadow 0.15s" }}>
      <span>{ftype.label}</span>
      {selected && <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); onDelete(field.id); }}
        style={{ position: "absolute", top: -9 * scale, right: -9 * scale, width: 18 * scale, height: 18 * scale, borderRadius: "50%",
          background: T.error, color: "#fff", border: "none", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", fontSize: 11 * scale, fontWeight: 700, padding: 0 }}>×</button>}
      {selected && <div onMouseDown={rs} style={{ position: "absolute", bottom: -4 * scale, right: -4 * scale,
        width: 9 * scale, height: 9 * scale, background: bc, borderRadius: 2, cursor: "nwse-resize" }} />}
    </div>
  );
}
