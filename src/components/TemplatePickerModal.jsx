import { useState, useEffect, useRef } from "react";
import * as db from "../lib/db";

const C = {
  paper:     "#FAFAF7",
  paperWarm: "#F2F2EE",
  ink:       "#0F1418",
  muted:     "#5A6168",
  soft:      "#8A8A82",
  forest:    "#1E5128",
  border:    "#E0E0DC",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

// Modal that lists the user's templates as selectable cards. Click a card →
// onSelect(template). No Use/Edit/Duplicate/Delete actions in this context;
// it's purely a picker.
export function TemplatePickerModal({ templates = [], onCancel, onSelect }) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(15, 20, 24, 0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20,
        fontFamily: FONT_SANS,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="pick-tmpl-title"
        style={{
          background: C.paper,
          borderRadius: 8,
          width: "100%",
          maxWidth: 880,
          maxHeight: "85vh",
          boxShadow: "0 16px 48px rgba(15, 20, 24, 0.18)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <header
          style={{
            padding: "20px 24px 16px",
            borderBottom: `1px solid ${C.border}`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div>
            <h2
              id="pick-tmpl-title"
              style={{
                fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600,
                color: C.ink, margin: "0 0 4px", letterSpacing: "-0.01em",
              }}
            >
              Pick a template
            </h2>
            <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
              The document and field placements come from the template. You'll fill in roles next.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            style={{
              background: "transparent", border: "none", color: C.muted,
              cursor: "pointer", padding: 4, marginTop: -4,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        <div style={{ padding: 24, overflowY: "auto" }}>
          {templates.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontSize: 14, color: C.muted, margin: "0 0 16px" }}>
                You don't have any templates yet. Save one from a document by clicking "Save as Template" in the prepare sidebar.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 16,
              }}
            >
              {templates.map(t => (
                <PickCard key={t.id} template={t} onClick={() => onSelect(t)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PickCard({ template, onClick }) {
  const fieldCount = (template.fields || []).length;
  const roleCount = (template.signerRoles || template.signer_roles || []).length;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        position: "relative",
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        padding: 0,
        cursor: "pointer",
        textAlign: "left",
        transition: "border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.forest; e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,20,24,0.08)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
    >
      <div
        style={{
          background: "#F5F5F1",
          padding: 10,
          aspectRatio: "8.5 / 11",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Thumbnail template={template} />
      </div>
      <div style={{ padding: "12px 14px", background: C.paperWarm }}>
        <div
          style={{
            fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 600, color: C.ink,
            margin: "0 0 2px",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
          title={template.name}
        >
          {template.name}
        </div>
        <div style={{ fontSize: 11, color: C.muted }}>
          {roleCount} {roleCount === 1 ? "role" : "roles"} · {fieldCount} {fieldCount === 1 ? "field" : "fields"}
        </div>
      </div>
    </button>
  );
}

function Thumbnail({ template }) {
  const [src, setSrc] = useState(null);
  const [failed, setFailed] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    if (!template.pdf_url) { setFailed(true); return; }

    const cacheKey = `tpl-thumb:${template.id}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) { setSrc(cached); return; }
    } catch { /* ignore */ }

    (async () => {
      try {
        const url = await db.getSignedPdfUrl(template.pdf_url);
        await waitForPdfJs();
        if (cancelled.current) return;
        const pdf = await window.pdfjsLib.getDocument({ url }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.5 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled.current) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        try { localStorage.setItem(cacheKey, dataUrl); } catch { /* quota */ }
        setSrc(dataUrl);
      } catch {
        if (!cancelled.current) setFailed(true);
      }
    })();
    return () => { cancelled.current = true; };
  }, [template.id, template.pdf_url]);

  if (failed || !template.pdf_url) {
    return <div style={{ width: "100%", height: "100%", color: C.soft, fontSize: 11, fontStyle: "italic", display: "flex", alignItems: "center", justifyContent: "center" }}>No preview</div>;
  }
  if (!src) return <div style={{ width: "100%", height: "100%", background: "#FFFFFF", border: `1px solid ${C.border}` }} />;
  return <img src={src} alt={template.name} style={{ maxWidth: "100%", maxHeight: "100%", display: "block", boxShadow: "0 1px 4px rgba(15,20,24,0.08)" }} draggable={false} />;
}

function waitForPdfJs() {
  return new Promise(resolve => {
    if (window.pdfjsLib) return resolve();
    const tag = document.createElement("script");
    tag.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    tag.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      resolve();
    };
    document.head.appendChild(tag);
  });
}
