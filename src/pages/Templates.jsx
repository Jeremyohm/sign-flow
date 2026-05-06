import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDocTitle } from "../utils";
import * as db from "../lib/db";

const C = {
  paper:       "#FAFAF7",
  paperWarm:   "#F2F2EE",
  paperHover:  "#EAEAE6",
  ink:         "#0F1418",
  muted:       "#5A6168",
  soft:        "#8A8A82",
  forest:      "#1E5128",
  forestDark:  "#163E1F",
  border:      "#E0E0DC",
  errorText:   "#A32D2D",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const s = Math.max(0, Math.floor(ms / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  const w = Math.floor(d / 7); if (w < 5) return `${w}w ago`;
  const mo = Math.floor(d / 30); return `${mo}mo ago`;
}

export function Templates({ templates = [], setTemplates, notify }) {
  useDocTitle("Templates");
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (templates.length === 0) {
    return <EmptyState navigate={navigate} notify={notify} />;
  }

  async function handleDuplicate(t) {
    try {
      const copy = await db.createTemplate(undefined, {
        name: `${t.name} (Copy)`,
        description: t.description,
        pages: t.pages,
        signerRoles: t.signerRoles || t.signer_roles,
        fields: t.fields,
        pdf_url: t.pdf_url,
        original_pdf_sha256: t.original_pdf_sha256,
      });
      setTemplates?.(prev => [
        { ...copy, signerRoles: copy.signer_roles, createdAt: copy.created_at, usageCount: copy.usage_count },
        ...prev,
      ]);
      notify?.("Template duplicated.");
    } catch (err) {
      console.error("Duplicate failed:", err);
      notify?.("Couldn't duplicate template.", "warning");
    }
  }

  async function handleDelete(t) {
    try {
      await db.deleteTemplate(t.id);
      setTemplates?.(prev => prev.filter(x => x.id !== t.id));
      setConfirmDelete(null);
      notify?.("Template deleted.");
    } catch (err) {
      console.error("Delete failed:", err);
      notify?.("Couldn't delete template.", "warning");
    }
  }

  function handleUse(t) {
    navigate(`/new?template=${t.id}`);
  }

  function handleEdit(t) {
    navigate(`/templates/${t.id}/edit`);
  }

  return (
    <div style={{ fontFamily: FONT_SANS }}>
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: C.ink,
              margin: "0 0 6px",
              lineHeight: 1.1,
            }}
          >
            Templates
          </h1>
          <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            Reusable layouts for documents you send often.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/templates/new")}
          className="db-newbtn"
          style={{
            padding: "11px 18px",
            background: C.forest,
            color: C.paper,
            border: "none",
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "background 150ms ease, transform 80ms ease",
            flexShrink: 0,
          }}
        >
          + New Template
        </button>
      </header>

      <style>{`
        .db-newbtn:hover { background: ${C.forestDark}; transform: translateY(-1px); }
        .db-newbtn:active { transform: translateY(0); }
        .tpl-card { transition: box-shadow 150ms ease, transform 150ms ease; }
        .tpl-card:hover { box-shadow: 0 4px 12px rgba(15, 20, 24, 0.08); transform: translateY(-1px); }
        .tpl-card:hover .tpl-overlay { transform: translateY(0); }
        .tpl-overlay { transform: translateY(100%); transition: transform 200ms ease; }
        .tpl-overlay-btn:hover { background: rgba(250, 250, 247, 0.12); }
        .tpl-overlay-btn-primary:hover { background: ${C.forestDark}; }
      `}</style>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 20,
        }}
      >
        {templates.map(t => (
          <TemplateCard
            key={t.id}
            template={t}
            onUse={() => handleUse(t)}
            onEdit={() => handleEdit(t)}
            onDuplicate={() => handleDuplicate(t)}
            onDelete={() => setConfirmDelete(t)}
          />
        ))}
      </div>

      {confirmDelete && (
        <ConfirmDeleteModal
          template={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => handleDelete(confirmDelete)}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onUse, onEdit, onDuplicate, onDelete }) {
  const fieldCount = (template.fields || []).length;
  const roleCount = (template.signerRoles || template.signer_roles || []).length;
  const usage = template.usageCount ?? template.usage_count ?? 0;
  const lastUsed = template.last_used_at;

  return (
    <div
      className="tpl-card"
      style={{
        position: "relative",
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        overflow: "hidden",
        boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          background: "#F5F5F1",
          padding: 12,
          aspectRatio: "8.5 / 11",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Thumbnail template={template} />
      </div>

      <div style={{ padding: "14px 16px 16px", background: C.paperWarm }}>
        <div
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 16,
            fontWeight: 600,
            color: C.ink,
            margin: "0 0 4px",
            letterSpacing: "-0.005em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
          title={template.name}
        >
          {template.name}
        </div>
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
          {roleCount} {roleCount === 1 ? "role" : "roles"} · {fieldCount} {fieldCount === 1 ? "field" : "fields"} · used {usage} {usage === 1 ? "time" : "times"}
        </div>
        <div style={{ fontSize: 11, color: C.soft, marginTop: 2 }}>
          {usage > 0 && lastUsed ? `Last used ${timeAgo(lastUsed)}` : "Never used"}
        </div>
      </div>

      <div
        className="tpl-overlay"
        style={{
          position: "absolute",
          left: 0, right: 0, bottom: 0,
          padding: "12px 14px",
          background: "rgba(30, 81, 40, 0.96)",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button type="button" onClick={onUse} className="tpl-overlay-btn-primary" style={overlayPrimaryBtn()}>Use</button>
        <button type="button" onClick={onEdit} className="tpl-overlay-btn" style={overlayBtn()}>Edit</button>
        <span style={{ flex: 1 }} />
        <button type="button" onClick={onDuplicate} className="tpl-overlay-btn" style={overlayIconBtn()} title="Duplicate template" aria-label="Duplicate template">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
        </button>
        <button type="button" onClick={onDelete} className="tpl-overlay-btn" style={overlayIconBtn()} title="Delete template" aria-label="Delete template">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function overlayPrimaryBtn() {
  return {
    padding: "7px 14px",
    background: C.forestDark,
    color: C.paper,
    border: "none",
    borderRadius: 4,
    fontFamily: FONT_SANS,
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 150ms ease",
  };
}
function overlayBtn() {
  return {
    padding: "7px 14px",
    background: "transparent",
    color: C.paper,
    border: "1px solid rgba(250, 250, 247, 0.4)",
    borderRadius: 4,
    fontFamily: FONT_SANS,
    fontSize: 12,
    fontWeight: 500,
    cursor: "pointer",
    transition: "background 150ms ease",
  };
}
function overlayIconBtn() {
  return {
    width: 28, height: 28,
    background: "transparent",
    color: C.paper,
    border: "1px solid rgba(250, 250, 247, 0.4)",
    borderRadius: 4,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background 150ms ease",
  };
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
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        await page.render({ canvasContext: ctx, viewport }).promise;
        if (cancelled.current) return;
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        try { localStorage.setItem(cacheKey, dataUrl); } catch { /* quota */ }
        setSrc(dataUrl);
      } catch (err) {
        console.warn("Template thumbnail render failed:", err);
        if (!cancelled.current) setFailed(true);
      }
    })();

    return () => { cancelled.current = true; };
  }, [template.id, template.pdf_url]);

  if (failed || !template.pdf_url) {
    return (
      <div style={{
        width: "100%", height: "100%",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: C.soft, fontSize: 12, fontStyle: "italic",
        textAlign: "center", padding: 20,
      }}>
        No preview available
      </div>
    );
  }

  if (!src) {
    return (
      <div style={{
        width: "100%", height: "100%",
        background: "#FFFFFF",
        border: `1px solid ${C.border}`,
        borderRadius: 2,
      }} />
    );
  }

  return (
    <img
      src={src}
      alt={template.name}
      style={{
        maxWidth: "100%", maxHeight: "100%",
        display: "block",
        boxShadow: "0 1px 4px rgba(15, 20, 24, 0.08)",
      }}
      draggable={false}
    />
  );
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

function ConfirmDeleteModal({ template, onCancel, onConfirm }) {
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
        role="dialog" aria-modal="true"
        style={{
          background: C.paper, borderRadius: 8,
          width: "100%", maxWidth: 400,
          padding: "24px 28px",
          boxShadow: "0 16px 48px rgba(15, 20, 24, 0.18)",
        }}
      >
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 20, fontWeight: 600, color: C.ink, margin: "0 0 8px" }}>
          Delete "{template.name}"?
        </h2>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.55, margin: "0 0 24px" }}>
          Envelopes already created from this template aren't affected. This can't be undone.
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "9px 16px", background: "transparent", color: C.ink,
              border: `1px solid ${C.border}`, borderRadius: 6,
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "9px 18px", background: C.errorText, color: C.paper,
              border: "none", borderRadius: 6,
              fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ navigate, notify }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "60vh",
        padding: "40px 24px",
        fontFamily: FONT_SANS,
      }}
    >
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: C.ink,
          margin: "0 0 12px",
          lineHeight: 1.1,
        }}
      >
        No templates yet.
      </h1>
      <p
        style={{
          fontSize: 15,
          color: C.muted,
          lineHeight: 1.55,
          maxWidth: 540,
          margin: "0 0 28px",
        }}
      >
        Templates save layouts you use often — like lease agreements or NDAs — so you don't replace fields every time.
      </p>
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/templates/new")}
          style={{
            padding: "12px 22px",
            background: C.forest,
            color: C.paper,
            border: "none",
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          Create a template
        </button>
        <button
          type="button"
          onClick={() => notify?.("From the Documents page, open a draft, click 'Save as Template' in the prepare sidebar.", "success")}
          style={{
            padding: "12px 22px",
            background: "transparent",
            color: C.ink,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Save from a document
        </button>
      </div>
    </div>
  );
}
