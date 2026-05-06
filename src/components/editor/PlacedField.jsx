import { useEffect, useRef } from "react";

const FONT_SANS = "'Inter', system-ui, sans-serif";
const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

const LABELS = {
  signature: "Signature",
  initials: "Initials",
  date: "Date",
  text: "Text",
};

const MIN_W = 40;
const MIN_H = 20;

// Single field rendered on the document. Takes a "box" in screen-pixel space
// (left/top/width/height already multiplied by zoom) and a recipient color.
// Calls onMove({left, top}) and onResize({width, height}, anchor) during pointer
// drags; commits via onCommit() at the end.
export function PlacedField({
  field,
  box,         // { left, top, width, height } in screen px
  color,
  isSelected,
  initials,    // recipient initials shown as placeholder hint for sig/initials types
  pageBoundsRef, // ref to the page DIV; used to clamp moves to page bounds
  zoom,
  onSelect,
  onMove,        // (newBox) → void, called rAF-throttled during drag
  onResize,      // (newBox) → void
  onCommit,      // () → void, called when drag/resize ends; triggers persistence
}) {
  const ref = useRef(null);

  // Pointer-based move.
  // Note: the final box is tracked in a local variable and passed explicitly
  // to onCommit. We CAN'T let the parent's onCommit closure read parent state
  // (e.g. draftBox) — that closure is captured at mousedown time and stays
  // pinned to the render that created it, which had draftBox=null. Passing
  // the value as an argument sidesteps the stale-closure trap.
  function startMove(e) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect();

    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = { ...box };
    let lastBox = startBox;
    let moved = false;

    function onMoveEv(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      // Click-vs-drag threshold: only switch to drag mode if the cursor moved
      // more than ~3px. Below that we treat the gesture as a click.
      if (!moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
      moved = true;

      let next = { ...startBox, left: startBox.left + dx, top: startBox.top + dy };

      // Clamp to page bounds
      const page = pageBoundsRef?.current;
      if (page) {
        const r = page.getBoundingClientRect();
        const maxLeft = r.width  - next.width;
        const maxTop  = r.height - next.height;
        next.left = Math.max(0, Math.min(maxLeft, next.left));
        next.top  = Math.max(0, Math.min(maxTop,  next.top));
      }
      lastBox = next;
      onMove(next);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUp);
      onCommit(moved ? lastBox : null);
    }
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp);
  }

  // Pointer-based resize. Same closure-trap dodge: pass the final box to onCommit.
  function startResize(e, handle) {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startBox = { ...box };
    let lastBox = startBox;
    let moved = false;

    function onMoveEv(ev) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!moved && Math.abs(dx) < 2 && Math.abs(dy) < 2) return;
      moved = true;

      let { left, top, width, height } = startBox;

      if (handle.includes("e")) width  = startBox.width  + dx;
      if (handle.includes("s")) height = startBox.height + dy;
      if (handle.includes("w")) { width = startBox.width - dx;  left = startBox.left + dx; }
      if (handle.includes("n")) { height = startBox.height - dy; top  = startBox.top  + dy; }

      if (width < MIN_W) {
        if (handle.includes("w")) left = startBox.left + (startBox.width - MIN_W);
        width = MIN_W;
      }
      if (height < MIN_H) {
        if (handle.includes("n")) top = startBox.top + (startBox.height - MIN_H);
        height = MIN_H;
      }

      const page = pageBoundsRef?.current;
      if (page) {
        const r = page.getBoundingClientRect();
        if (left < 0) { width += left; left = 0; }
        if (top  < 0) { height += top;  top  = 0; }
        if (left + width  > r.width)  width  = r.width  - left;
        if (top  + height > r.height) height = r.height - top;
      }

      lastBox = { left, top, width, height };
      onResize(lastBox);
    }
    function onUp() {
      window.removeEventListener("pointermove", onMoveEv);
      window.removeEventListener("pointerup", onUp);
      onCommit(moved ? lastBox : null);
    }
    window.addEventListener("pointermove", onMoveEv);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <div
      ref={ref}
      onPointerDown={startMove}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      style={{
        position: "absolute",
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        background: `${color}1A`,                  // ~10% opacity fill
        border: `${isSelected ? 2 : 1}px solid ${color}`,
        borderRadius: 4,
        cursor: "move",
        boxSizing: "border-box",
        fontFamily: FONT_SANS,
        fontSize: 11,
        color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        transition: "transform 100ms ease",
        transform: isSelected ? "scale(1.02)" : "scale(1)",
        zIndex: isSelected ? 20 : 10,
      }}
    >
      <span
        style={{
          pointerEvents: "none",
          padding: "0 6px",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "100%",
          fontWeight: 500,
        }}
      >
        {(field.type === "signature" || field.type === "initials") && initials
          ? `${LABELS[field.type]} · ${initials}`
          : LABELS[field.type] || field.type}
      </span>

      {isSelected && HANDLES.map(h => (
        <span
          key={h}
          onPointerDown={(e) => startResize(e, h)}
          style={{
            ...handleStyle(h),
            background: color,
            cursor: handleCursor(h),
          }}
        />
      ))}
    </div>
  );
}

function handleStyle(h) {
  const base = { position: "absolute", width: 8, height: 8, borderRadius: "50%" };
  const half = -4;
  switch (h) {
    case "nw": return { ...base, left: half, top: half };
    case "n":  return { ...base, left: "50%", marginLeft: half, top: half };
    case "ne": return { ...base, right: half, top: half };
    case "e":  return { ...base, right: half, top: "50%", marginTop: half };
    case "se": return { ...base, right: half, bottom: half };
    case "s":  return { ...base, left: "50%", marginLeft: half, bottom: half };
    case "sw": return { ...base, left: half, bottom: half };
    case "w":  return { ...base, left: half, top: "50%", marginTop: half };
    default:   return base;
  }
}

function handleCursor(h) {
  if (h === "n" || h === "s") return "ns-resize";
  if (h === "e" || h === "w") return "ew-resize";
  if (h === "ne" || h === "sw") return "nesw-resize";
  return "nwse-resize"; // nw / se
}
