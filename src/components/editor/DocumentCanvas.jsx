import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { CanvasToolbar } from "./CanvasToolbar";
import { PageNavigation } from "./PageNavigation";
import { PlacedField } from "./PlacedField";
import { FieldInspector } from "./FieldInspector";
import { FIELD_DEFAULTS } from "./FieldTypeCard";

const C = {
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  ink: "#0F1418",
  muted: "#5A6168",
  border: "#E0E0DC",
};
const FONT_SANS = "'Inter', system-ui, sans-serif";

// Canvas hosts:
//  - PDF page image at zoom-applied dimensions
//  - PlacedFields positioned absolutely over it
//  - HTML5 drop target for sidebar field types
//  - Toolbar above (zoom + save indicator) and PageNavigation below
//
// Coordinate convention: db.fields.x/y/w/h are TOP-LEFT origin in the same
// units the source page is rendered in (pages from pdf.js render at scale 1.5,
// so DB units = source pixels at 1.5x ≈ PDF points × 1.5). We reuse that —
// `pageNaturalWidth/Height` is the rendered image's natural pixel size.
//
// Screen px = DB unit × zoom. So a stored field with x=120, w=180 on a page
// rendered to 918×1188 px shows at zoom=1 as 120px from left, 180px wide.

export function DocumentCanvas({
  pages,                  // array of dataURL strings (one per page)
  pageNaturalSizes,       // [{ w, h }] in source px (the image's natural dims)
  fields,                 // [{ id, page, x, y, w, h, type, signer_id }]
  recipients,             // [{ id, name, email, color }]
  activeRecipientId,
  selectedFieldId,
  setSelectedFieldId,
  saveStatus,
  onCreateField,          // ({ page, x, y, w, h, type, signer_id }) → void
  onUpdateField,          // (id, { x, y, w, h, signer_id }) → void
  onDeleteField,
  onDuplicateField,
}) {
  const containerRef = useRef(null);
  const pageRef = useRef(null);
  const [page, setPage] = useState(0);
  const [zoomMode, setZoomMode] = useState("fit-width"); // "fit-width" | "fit-page" | numeric
  const [zoom, setZoomValue] = useState(1);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [draftBox, setDraftBox] = useState(null); // optimistic preview during drag/resize

  // Persist user-chosen zoom (numeric) per envelope. Restored at mount.
  // Identifier comes from fields[0]?.envelope_id if present; otherwise no persist.
  const envelopeId = fields[0]?.envelope_id || null;
  useEffect(() => {
    if (!envelopeId) return;
    try {
      const raw = localStorage.getItem(`editor:zoom:${envelopeId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.mode) setZoomMode(parsed.mode);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envelopeId]);

  // Measure container width/height for fit modes.
  useLayoutEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const r = containerRef.current.getBoundingClientRect();
      setContainerSize({ w: r.width, h: r.height });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Compute effective zoom from mode + page size + container.
  useEffect(() => {
    const ps = pageNaturalSizes?.[page];
    if (!ps || !containerSize.w) return;
    const padding = 96; // 48px on each side
    if (zoomMode === "fit-width") {
      const z = Math.max(0.25, (containerSize.w - padding) / ps.w);
      setZoomValue(z);
    } else if (zoomMode === "fit-page") {
      const z = Math.max(
        0.25,
        Math.min((containerSize.w - padding) / ps.w, (containerSize.h - padding) / ps.h),
      );
      setZoomValue(z);
    } else if (typeof zoomMode === "number") {
      setZoomValue(zoomMode);
    }
  }, [zoomMode, page, pageNaturalSizes, containerSize]);

  function setZoom(level) {
    setZoomMode(level); // numeric
    if (envelopeId) {
      try { localStorage.setItem(`editor:zoom:${envelopeId}`, JSON.stringify({ mode: level })); }
      catch { /* ignore */ }
    }
  }
  function setZoomFit(mode) {
    setZoomMode(mode);
    if (envelopeId) {
      try { localStorage.setItem(`editor:zoom:${envelopeId}`, JSON.stringify({ mode })); }
      catch { /* ignore */ }
    }
  }

  const ps = pageNaturalSizes?.[page] || { w: 612, h: 792 };
  const renderedW = ps.w * zoom;
  const renderedH = ps.h * zoom;

  // ── Drop target for field-type cards from sidebar ──
  function onDragOver(e) {
    if (e.dataTransfer.types.includes("text/sf-field-type")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }
  function onDrop(e) {
    const type = e.dataTransfer.getData("text/sf-field-type");
    if (!type) return;
    e.preventDefault();
    const pageEl = pageRef.current;
    if (!pageEl) return;
    const r = pageEl.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const def = FIELD_DEFAULTS[type] || { w: 160, h: 24 };
    // Convert screen px → DB units (source-image pixels, top-left origin)
    const dbX = (dx - (def.w * zoom) / 2) / zoom;
    const dbY = (dy - (def.h * zoom) / 2) / zoom;
    const clampedX = Math.max(0, Math.min(ps.w - def.w, dbX));
    const clampedY = Math.max(0, Math.min(ps.h - def.h, dbY));
    onCreateField({
      type,
      page,
      x: clampedX, y: clampedY, w: def.w, h: def.h,
      signer_id: activeRecipientId,
    });
  }

  // Click outside any field → deselect
  function onCanvasClick(e) {
    if (e.target === e.currentTarget) setSelectedFieldId(null);
  }

  const visibleFields = fields.filter(f => (f.page ?? 0) === page);
  const selectedField = visibleFields.find(f => f.id === selectedFieldId);

  function fieldToBox(f) {
    return {
      left: f.x * zoom,
      top: f.y * zoom,
      width: f.w * zoom,
      height: f.h * zoom,
    };
  }
  function boxToField(box) {
    return {
      x: box.left / zoom,
      y: box.top / zoom,
      w: box.width / zoom,
      h: box.height / zoom,
    };
  }

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        background: C.paperWarm,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "24px 16px 24px",
        minHeight: 0,
        overflow: "auto",
      }}
    >
      {/* Toolbar */}
      <div style={{ marginBottom: 16 }}>
        <CanvasToolbar
          zoom={zoom}
          setZoom={(v) => setZoom(v)}
          onFitWidth={() => setZoomFit("fit-width")}
          onFitPage={() => setZoomFit("fit-page")}
          saveStatus={saveStatus}
        />
      </div>

      {/* The page itself */}
      <div
        style={{
          position: "relative",
          width: renderedW,
          height: renderedH,
          marginBottom: 24,
          flexShrink: 0,
        }}
      >
        <div
          ref={pageRef}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={onCanvasClick}
          style={{
            position: "relative",
            width: renderedW,
            height: renderedH,
            background: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(15, 20, 24, 0.06)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          {pages?.[page] && (
            <img
              src={pages[page]}
              alt={`Page ${page + 1}`}
              draggable={false}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}

          {visibleFields.map(f => {
            const recipient = recipients.find(r => r.id === f.signer_id);
            const color = recipient?.color || "#5A6168";
            const isSelected = f.id === selectedFieldId;
            const box = isSelected && draftBox ? draftBox : fieldToBox(f);
            const initials = recipient?.name
              ? recipient.name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase()
              : "";

            return (
              <PlacedField
                key={f.id}
                field={f}
                box={box}
                color={color}
                isSelected={isSelected}
                initials={initials}
                pageBoundsRef={pageRef}
                zoom={zoom}
                onSelect={() => setSelectedFieldId(f.id)}
                onMove={(b) => setDraftBox(b)}
                onResize={(b) => setDraftBox(b)}
                // finalBox is passed in by PlacedField — null means "treated as
                // a click, no movement". Otherwise commit the new geometry.
                // Don't read draftBox here: this closure is captured at
                // mousedown and goes stale.
                onCommit={(finalBox) => {
                  if (finalBox) {
                    onUpdateField(f.id, boxToField(finalBox));
                  }
                  setDraftBox(null);
                }}
              />
            );
          })}
        </div>

        {/* Floating inspector for the selected field */}
        {selectedField && (() => {
          const box = draftBox || fieldToBox(selectedField);
          return (
            <FieldInspector
              position={{ left: box.left + box.width / 2, top: box.top }}
              recipients={recipients}
              onReassign={(rid) => onUpdateField(selectedField.id, { signer_id: rid })}
              onDelete={() => onDeleteField(selectedField.id)}
              onDuplicate={() => onDuplicateField(selectedField.id)}
            />
          );
        })()}
      </div>

      {/* Page navigation */}
      {pages && pages.length > 0 && (
        <PageNavigation current={page} total={pages.length} onChange={setPage} />
      )}
    </div>
  );
}
