import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, Navigate } from "react-router-dom";
import { useDocTitle } from "../../utils";
import { LogoMark } from "../ui";
import { useAuth } from "../../lib/AuthContext";
import * as db from "../../lib/db";
import { TemplateSidebar } from "./TemplateSidebar";
import { DocumentCanvas } from "./DocumentCanvas";
import { colorForSignerIndex } from "./recipientColors";

const C = {
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  ink: "#0F1418",
  muted: "#5A6168",
  forest: "#1E5128",
  border: "#E0E0DC",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

const TOP_BAR_HEIGHT = 56;
const MOBILE_BREAKPOINT = 1024;

// Top-level page for both /templates/new/place (create) and /templates/:id/edit
// (edit). Reuses DocumentCanvas + the field components from the envelope editor.
// Differences from PrepareEditor:
//  - No "envelope" — fields are local state, not autosaved per change.
//  - Sidebar shows Roles (just labels), not Recipients with names/emails.
//  - Save Template = bulk-write all changes to templates row (and PDF if new).
export function TemplateEditor({ templates = [], setTemplates, notify, mode = "create" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: routeTemplateId } = useParams();
  const { user } = useAuth();

  const isEdit = mode === "edit";
  const incoming = location.state || {};

  // For create mode, the previous step (TemplateNew) hands us the PDF + name
  // via location.state. If the user navigates here directly, redirect home.
  const initialState = useMemo(() => {
    if (isEdit) {
      const t = templates.find(t => t.id === routeTemplateId);
      if (!t) return null;
      return {
        templateId: t.id,
        templateName: t.name,
        templateDescription: t.description || "",
        roles: (t.signerRoles || t.signer_roles || []).map((label, i) => ({
          id: `role_${i}`,
          label,
          color: colorForSignerIndex(i),
        })),
        fields: (t.fields || []).map(f => ({
          id: `f_${Math.random().toString(36).slice(2, 9)}`,
          page: f.page ?? 0,
          x: f.x, y: f.y, w: f.w, h: f.h,
          type: f.type,
          role_index: f.role_index ?? 0,
        })),
        pdfUrl: t.pdf_url,
        pdfFile: null,
        originalSha256: t.original_pdf_sha256 || null,
      };
    }
    // create mode
    if (!incoming.pdfFile && !incoming.pdfUrl) return null;
    return {
      templateId: null,
      templateName: incoming.templateName || "",
      templateDescription: incoming.templateDescription || "",
      roles: [{ id: `role_0`, label: "Signer 1", color: colorForSignerIndex(0) }],
      fields: [],
      pdfUrl: incoming.pdfUrl || null,
      pdfFile: incoming.pdfFile || null,
      originalSha256: incoming.originalSha256 || null,
    };
  }, [isEdit, routeTemplateId, templates, incoming]);

  const [name, setName] = useState(initialState?.templateName || "");
  const [description, setDescription] = useState(initialState?.templateDescription || "");
  const [roles, setRoles] = useState(initialState?.roles || []);
  const [fields, setFields] = useState(initialState?.fields || []);
  const [activeRoleId, setActiveRoleId] = useState(roles[0]?.id || null);
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [pages, setPages] = useState(null);
  const [pageNaturalSizes, setPageNaturalSizes] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );

  useDocTitle(isEdit ? `Edit · ${name || "Template"}` : "New Template");

  // ── Mobile breakpoint ──
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Render PDF pages ──
  useEffect(() => {
    if (!initialState) return;
    if (pages) return;
    let cancelled = false;
    (async () => {
      try {
        await waitForPdfJs();
        let arrayBuffer;
        if (initialState.pdfFile) {
          arrayBuffer = await initialState.pdfFile.arrayBuffer();
        } else if (initialState.pdfUrl) {
          const url = await db.getSignedPdfUrl(initialState.pdfUrl);
          const res = await fetch(url);
          arrayBuffer = await res.arrayBuffer();
        } else {
          return;
        }
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const imgs = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          imgs.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) setPages(imgs);
      } catch (err) {
        console.error("Template PDF load failed:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [initialState, pages]);

  // ── Natural sizes from rendered images ──
  useEffect(() => {
    if (!pages) return;
    let cancelled = false;
    Promise.all(pages.map(src => new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 918, h: 1188 });
      img.src = src;
    }))).then(sizes => { if (!cancelled) setPageNaturalSizes(sizes); });
    return () => { cancelled = true; };
  }, [pages]);

  // beforeunload guard (template editor has no autosave, so user loses work
  // if they leave with unsaved changes)
  useEffect(() => {
    function onBeforeUnload(e) {
      if (fields.length > 0 && !saving) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [fields.length, saving]);

  if (!initialState) {
    notify?.("Template not found.", "warning");
    return <Navigate to="/templates" replace />;
  }

  if (isMobile) {
    return <MobileFallback navigate={navigate} />;
  }

  // ── Roles management ──
  function addRole() {
    const idx = roles.length;
    setRoles(rs => [...rs, {
      id: `role_${idx}_${Math.random().toString(36).slice(2, 6)}`,
      label: `Signer ${idx + 1}`,
      color: colorForSignerIndex(idx),
    }]);
  }
  function removeRole(roleId) {
    if (roles.length <= 1) return;
    const removedIdx = roles.findIndex(r => r.id === roleId);
    setRoles(rs => {
      const next = rs.filter(r => r.id !== roleId);
      // Recolor in order — the first role keeps brand green even after deletion.
      return next.map((r, i) => ({ ...r, color: colorForSignerIndex(i) }));
    });
    // Drop fields belonging to the removed role; shift higher indices down.
    setFields(fs => fs
      .filter(f => indexFromRoleId(roles, f.role_index) !== removedIdx)
      .map(f => {
        const idx = indexFromRoleId(roles, f.role_index);
        return idx > removedIdx ? { ...f, role_index: idx - 1 } : f;
      }),
    );
    if (activeRoleId === roleId) {
      setActiveRoleId(roles[0]?.id !== roleId ? roles[0]?.id : roles[1]?.id);
    }
  }
  function updateRoleLabel(roleId, label) {
    setRoles(rs => rs.map(r => r.id === roleId ? { ...r, label } : r));
  }
  function moveRole(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    setRoles(rs => {
      const copy = [...rs];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy.map((r, i) => ({ ...r, color: colorForSignerIndex(i) }));
    });
    // Field role_indexes need to shift to track the move
    setFields(fs => fs.map(f => {
      const old = f.role_index;
      let next = old;
      if (old === fromIdx) next = toIdx;
      else if (fromIdx < toIdx && old > fromIdx && old <= toIdx) next = old - 1;
      else if (fromIdx > toIdx && old >= toIdx && old < fromIdx) next = old + 1;
      return { ...f, role_index: next };
    }));
  }

  // Adapter: DocumentCanvas wants recipients with `id` (signer_id) — we synthesize
  // them from roles. role.id ↔ signer_id, role.color matches.
  const fakeRecipients = roles.map((r) => ({ id: r.id, name: r.label, color: r.color }));

  // Field shape adapter: TemplateEditor stores fields with role_index, but
  // DocumentCanvas/PlacedField want signer_id. Translate both directions.
  const canvasFields = fields.map(f => ({
    id: f.id,
    page: f.page, x: f.x, y: f.y, w: f.w, h: f.h,
    type: f.type,
    signer_id: roles[f.role_index]?.id || roles[0]?.id,
  }));

  function handleCreateField({ type, page, x, y, w, h, signer_id }) {
    const roleIdx = roles.findIndex(r => r.id === signer_id);
    const tempId = `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setFields(fs => [...fs, {
      id: tempId, page, x, y, w, h, type,
      role_index: roleIdx >= 0 ? roleIdx : 0,
    }]);
    setSelectedFieldId(tempId);
  }
  function handleUpdateField(fieldId, updates) {
    setFields(fs => fs.map(f => {
      if (f.id !== fieldId) return f;
      const patch = { ...updates };
      if (patch.signer_id) {
        const idx = roles.findIndex(r => r.id === patch.signer_id);
        if (idx >= 0) patch.role_index = idx;
        delete patch.signer_id;
      }
      return { ...f, ...patch };
    }));
  }
  function handleDeleteField(fieldId) {
    setFields(fs => fs.filter(f => f.id !== fieldId));
    setSelectedFieldId(prev => (prev === fieldId ? null : prev));
  }
  function handleDuplicateField(fieldId) {
    const src = fields.find(f => f.id === fieldId);
    if (!src) return;
    const ps = pageNaturalSizes?.[src.page] || { w: 612, h: 792 };
    handleCreateField({
      type: src.type,
      page: src.page,
      x: Math.min(ps.w - src.w, src.x + 20),
      y: Math.min(ps.h - src.h, src.y + 20),
      w: src.w, h: src.h,
      signer_id: roles[src.role_index]?.id || roles[0]?.id,
    });
  }

  // ── Save ──

  const validation = validateForSave(roles, fields);

  async function handleSaveTemplate() {
    if (!validation.ok || !user) return;
    setSaving(true);

    try {
      let pdfUrl = initialState.pdfUrl;
      let originalSha256 = initialState.originalSha256;

      // Create mode: upload the PDF first (only on first save)
      if (mode === "create" && initialState.pdfFile) {
        const result = await db.uploadPdfForTemplate(user.id, initialState.pdfFile);
        pdfUrl = result.path;
        originalSha256 = result.sha256;
      }

      const templateFields = fields.map(f => ({
        type: f.type,
        page: f.page,
        x: f.x, y: f.y, w: f.w, h: f.h,
        role_index: f.role_index ?? 0,
      }));
      const signerRoles = roles.map(r => r.label);

      if (isEdit) {
        const updated = await db.updateTemplate(initialState.templateId, {
          name,
          description,
          pages: pages?.length ?? 1,
          signer_roles: signerRoles,
          fields: templateFields,
        });
        setTemplates?.(prev => prev.map(t => t.id === updated.id
          ? { ...t, ...updated, signerRoles: updated.signer_roles, usageCount: updated.usage_count }
          : t));
        // Bust thumbnail cache (fields may have moved)
        try { localStorage.removeItem(`tpl-thumb:${updated.id}`); } catch { /* ignore */ }
        notify?.("Template updated.");
      } else {
        const created = await db.createTemplate(user.id, {
          name,
          description,
          pages: pages?.length ?? 1,
          signerRoles,
          fields: templateFields,
          pdf_url: pdfUrl,
          original_pdf_sha256: originalSha256,
        });
        setTemplates?.(prev => [
          { ...created, signerRoles: created.signer_roles, createdAt: created.created_at, usageCount: created.usage_count },
          ...(prev || []),
        ]);
        notify?.("Template created.");
      }

      navigate("/templates");
    } catch (err) {
      console.error("Save template failed:", err);
      notify?.(err?.message || "Couldn't save template. Try again.", "warning");
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        color: C.ink,
        fontFamily: FONT_SANS,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: TOP_BAR_HEIGHT,
          background: C.paper,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
          <button
            type="button"
            onClick={() => navigate("/templates")}
            style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "transparent", border: "none", cursor: "pointer", padding: 0, flexShrink: 0 }}
          >
            <LogoMark size={26} color={C.forest} />
            <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: C.forest, letterSpacing: "-0.01em" }}>
              Sign Flow
            </span>
          </button>
          <span style={{ height: 20, width: 1, background: C.border, flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span
              onClick={() => navigate("/templates")}
              style={{ cursor: "pointer" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
            >
              Templates
            </span>
            <span style={{ margin: "0 6px" }}>›</span>
            <span style={{ color: C.ink, fontWeight: 500 }}>{name || (isEdit ? "Edit template" : "New Template")}</span>
            <span style={{ margin: "0 6px" }}>·</span>
            <span>Place fields</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.email}
        </div>
      </header>

      <div
        style={{
          marginTop: TOP_BAR_HEIGHT,
          display: "flex",
          height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
          minHeight: 0,
        }}
      >
        <TemplateSidebar
          templateName={name}
          pageCount={pages?.length ?? 0}
          roles={roles}
          activeRoleId={activeRoleId}
          setActiveRoleId={setActiveRoleId}
          onRoleLabelChange={updateRoleLabel}
          onAddRole={addRole}
          onRemoveRole={removeRole}
          onMoveRole={moveRole}
          onBack={() => navigate("/templates")}
          onSaveTemplate={handleSaveTemplate}
          saving={saving}
          saveDisabled={!validation.ok}
          saveDisabledReason={validation.reason}
        />

        <DocumentCanvas
          pages={pages || []}
          pageNaturalSizes={pageNaturalSizes || []}
          fields={canvasFields}
          recipients={fakeRecipients}
          activeRecipientId={activeRoleId}
          selectedFieldId={selectedFieldId}
          setSelectedFieldId={setSelectedFieldId}
          saveStatus="idle"
          onCreateField={handleCreateField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onDuplicateField={handleDuplicateField}
        />
      </div>
    </div>
  );
}

// ── Helpers ──

function indexFromRoleId(roles, roleIndex) {
  // pass-through; kept as a function in case role_index encoding changes later
  return roleIndex;
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

function validateForSave(roles, fields) {
  if (roles.length === 0) return { ok: false, reason: "Add at least one role." };
  if (roles.some(r => !r.label.trim())) return { ok: false, reason: "Every role needs a label." };
  if (fields.length === 0) return { ok: false, reason: "Place at least one field on the document." };
  for (let i = 0; i < roles.length; i++) {
    const hasField = fields.some(f => (f.role_index ?? 0) === i);
    if (!hasField) {
      return {
        ok: false,
        reason: `${roles[i].label || `Role ${i + 1}`} doesn't have any fields assigned.`,
      };
    }
  }
  // Unique labels
  const lower = roles.map(r => r.label.trim().toLowerCase());
  if (new Set(lower).size !== lower.length) {
    return { ok: false, reason: "Role labels must be unique." };
  }
  return { ok: true, reason: "" };
}

function MobileFallback({ navigate }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paperWarm,
        fontFamily: FONT_SANS,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "32px 24px", textAlign: "center",
      }}
    >
      <div style={{ marginBottom: 24 }}><LogoMark size={36} color={C.forest} /></div>
      <h1 style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 600, color: C.ink, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
        Open this on a larger screen.
      </h1>
      <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.55, maxWidth: 420, margin: "0 0 28px" }}>
        Template editing isn't comfortable on a phone. Open Sign Flow on a desktop or tablet.
      </p>
      <button
        type="button"
        onClick={() => navigate("/templates")}
        style={{
          padding: "11px 20px", background: C.forest, color: C.paper,
          border: "none", borderRadius: 6, fontFamily: FONT_SANS,
          fontSize: 14, fontWeight: 600, cursor: "pointer",
        }}
      >
        Back to templates
      </button>
    </div>
  );
}
