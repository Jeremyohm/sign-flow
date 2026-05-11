import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { useDocTitle } from "../../utils";
import { LogoMark } from "../ui";
import { useAuth } from "../../lib/AuthContext";
import * as db from "../../lib/db";
import { PrepareSidebar } from "./PrepareSidebar";
import { DocumentCanvas } from "./DocumentCanvas";
import { colorForSignerIndex } from "./recipientColors";
import { SaveTemplateModal } from "../SaveTemplateModal";
import { UpgradePromptModal } from "../UpgradePromptModal";

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
const ONBOARDING_KEY = "editor_onboarded_v1";
const MOBILE_BREAKPOINT = 1024;
const SAVE_DEBOUNCE_MS = 500;

export function PrepareEditor({ envelopes, notify, setEnvelopes, setTemplates, sendEmail }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const env = envelopes.find(e => e.id === id);
  useDocTitle(env ? `Prepare · ${env.name}` : "Prepare");

  // ── Local field state (keyed by field id; new ones get a temp id) ──
  const [fields, setFields] = useState(() =>
    (env?.fields || []).map(normalizeField).filter(f => f.id),
  );
  const [selectedFieldId, setSelectedFieldId] = useState(null);
  const [activeRecipientId, setActiveRecipientId] = useState(null);
  const [pages, setPages] = useState(env?.pdfPages || null);
  const [pageNaturalSizes, setPageNaturalSizes] = useState(null);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | failed
  const [showOnboarding, setShowOnboarding] = useState(() => {
    try { return !localStorage.getItem(ONBOARDING_KEY); } catch { return false; }
  });
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT,
  );
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [upgradeKind, setUpgradeKind] = useState(null);

  // ── Recipients (signers only — CCs filtered out, no fields to assign) ──
  const recipients = useMemo(() => {
    const signers = (env?.signers || [])
      .filter(s => (s.recipient_type || "signer") !== "cc")
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return signers.map((s, i) => ({
      ...s,
      color: colorForSignerIndex(i),
      fieldCount: fields.filter(f => f.signer_id === s.id).length,
    }));
  }, [env, fields]);

  // Default active recipient = first signer
  useEffect(() => {
    if (!activeRecipientId && recipients.length > 0) {
      setActiveRecipientId(recipients[0].id);
    }
  }, [recipients, activeRecipientId]);

  // ── Mobile breakpoint listener ──
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth < MOBILE_BREAKPOINT); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ── Load PDF pages (if not already passed via env.pdfPages) ──
  useEffect(() => {
    if (!env) return;
    if (pages) return;
    if (!env.pdf_url) return;
    let cancelled = false;
    (async () => {
      try {
        const url = await db.getSignedPdfUrl(env.pdf_url);
        await waitForPdfJs();
        const pdf = await window.pdfjsLib.getDocument({ url }).promise;
        const pageImages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          await page.render({ canvasContext: ctx, viewport }).promise;
          pageImages.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) setPages(pageImages);
      } catch (err) {
        console.error("Failed to load PDF:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [env, pages]);

  // ── Compute natural sizes from the rendered page images (loaded async) ──
  useEffect(() => {
    if (!pages) return;
    let cancelled = false;
    Promise.all(
      pages.map(src => new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
        img.onerror = () => resolve({ w: 918, h: 1188 }); // fallback letter @ 1.5x
        img.src = src;
      })),
    ).then(sizes => { if (!cancelled) setPageNaturalSizes(sizes); });
    return () => { cancelled = true; };
  }, [pages]);

  // ── Autosave plumbing ──
  const pendingTimers = useRef(new Map()); // fieldId → timeoutId
  const inFlight = useRef(0);
  const failures = useRef(new Map()); // fieldId → { attempts, op, payload }

  function flashSaved() {
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(s => (s === "saved" ? "idle" : s)), 1500);
  }

  const persistUpdate = useCallback(async (fieldId, updates) => {
    inFlight.current += 1;
    setSaveStatus("saving");
    try {
      await db.updateField(fieldId, updates);
      failures.current.delete(fieldId);
      inFlight.current -= 1;
      if (inFlight.current === 0) flashSaved();
    } catch (err) {
      console.error("updateField failed:", err);
      inFlight.current -= 1;
      const f = failures.current.get(fieldId) || { attempts: 0 };
      f.attempts += 1;
      failures.current.set(fieldId, f);
      if (f.attempts < 3) {
        setSaveStatus("failed");
        setTimeout(() => persistUpdate(fieldId, updates), 800 * Math.pow(2, f.attempts - 1));
      } else {
        setSaveStatus("failed");
      }
    }
  }, []);

  // Debounce per-field updates so rapid drag deltas collapse into one DB write.
  function scheduleUpdate(fieldId, updates) {
    const existing = pendingTimers.current.get(fieldId);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      pendingTimers.current.delete(fieldId);
      persistUpdate(fieldId, updates);
    }, SAVE_DEBOUNCE_MS);
    pendingTimers.current.set(fieldId, t);
  }

  // ── Field mutation handlers ──

  async function handleCreateField({ type, page, x, y, w, h, signer_id }) {
    if (!signer_id) {
      notify?.("Pick a recipient first", "warning");
      return;
    }
    if (!env) return;

    const tempId = `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const optimistic = { id: tempId, envelope_id: env.id, type, page, x, y, w, h, signer_id, value: null, _temp: true };
    setFields(fs => [...fs, optimistic]);
    setSelectedFieldId(tempId);

    if (showOnboarding) {
      setShowOnboarding(false);
      try { localStorage.setItem(ONBOARDING_KEY, "1"); } catch { /* ignore */ }
    }

    inFlight.current += 1;
    setSaveStatus("saving");
    try {
      const created = await db.createField(env.id, { type, page, x, y, w, h, signer_id });
      setFields(fs => fs.map(f => (f.id === tempId ? { ...created } : f)));
      setSelectedFieldId(prev => (prev === tempId ? created.id : prev));
      inFlight.current -= 1;
      if (inFlight.current === 0) flashSaved();
    } catch (err) {
      console.error("createField failed:", err);
      // Roll back the optimistic field
      setFields(fs => fs.filter(f => f.id !== tempId));
      inFlight.current -= 1;
      setSaveStatus("failed");
    }
  }

  function handleUpdateField(fieldId, updates) {
    setFields(fs => fs.map(f => (f.id === fieldId ? { ...f, ...updates } : f)));
    if (String(fieldId).startsWith("tmp_")) return; // wait for DB id before persisting
    scheduleUpdate(fieldId, updates);
  }

  async function handleDeleteField(fieldId) {
    setFields(fs => fs.filter(f => f.id !== fieldId));
    setSelectedFieldId(prev => (prev === fieldId ? null : prev));
    if (String(fieldId).startsWith("tmp_")) return;
    inFlight.current += 1;
    setSaveStatus("saving");
    try {
      await db.deleteField(fieldId);
      inFlight.current -= 1;
      if (inFlight.current === 0) flashSaved();
    } catch (err) {
      console.error("deleteField failed:", err);
      inFlight.current -= 1;
      setSaveStatus("failed");
    }
  }

  async function handleDuplicateField(fieldId) {
    const original = fields.find(f => f.id === fieldId);
    if (!original) return;
    await handleCreateField({
      type: original.type,
      page: original.page,
      x: Math.min((pageNaturalSizes?.[original.page]?.w || 612) - original.w, original.x + 20),
      y: Math.min((pageNaturalSizes?.[original.page]?.h || 792) - original.h, original.y + 20),
      w: original.w,
      h: original.h,
      signer_id: original.signer_id,
    });
  }

  // beforeunload guard if anything is mid-flight
  useEffect(() => {
    function onBeforeUnload(e) {
      if (inFlight.current > 0 || pendingTimers.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // ── Send for Signing ──

  const sendValidation = useMemo(() => validateForSend(recipients, fields), [recipients, fields]);

  async function handleSend() {
    if (!sendValidation.ok || !env) return;
    try {
      await db.updateEnvelope(env.id, { status: "sent" });
      const updated = { ...env, status: "sent", fields, signers: env.signers, updatedAt: new Date().toISOString() };
      setEnvelopes(prev => prev.map(e => (e.id === env.id ? updated : e)));

      const firstSigner = (env.signers || []).find(
        s => s.status === "pending" && (s.recipient_type || "signer") !== "cc",
      );
      if (firstSigner?.email) sendEmail(updated, firstSigner, "request");
      notify?.(`"${env.name}" sent${firstSigner?.email ? ` · signing request emailed to ${firstSigner.name}` : ""}.`);
      navigate("/");
    } catch (err) {
      console.error("Send error:", err);
      const msg = err?.message || "";
      if (msg.includes("envelope_limit_reached")) {
        setUpgradeKind("envelope");
        return;
      }
      if (msg.includes("recipient_limit_reached")) {
        setUpgradeKind("recipient");
        return;
      }
      notify?.("Failed to send envelope", "warning");
    }
  }

  function handleSaveTemplate() {
    if (recipients.length === 0) {
      notify?.("Add at least one signer before saving a template.", "warning");
      return;
    }
    if (fields.length === 0) {
      notify?.("Place at least one field before saving a template.", "warning");
      return;
    }
    setShowSaveTemplate(true);
  }

  async function handleConfirmSaveTemplate({ name, description, roles }) {
    if (!user || !env) throw new Error("missing_context");

    // Copy the envelope's stored PDF to a template-owned path.
    let templatePdfUrl = null;
    if (env.pdf_url) {
      try {
        templatePdfUrl = await db.copyPdfForTemplate(env.pdf_url, user.id);
      } catch (err) {
        // Non-fatal; the template still saves but without its own PDF copy.
        // Original envelope's PDF remains shared (can be cleaned up later).
        console.warn("Template PDF copy failed:", err);
      }
    }

    // Map signer_id → role index. Templates store fields with role_index, not
    // signer_id (so they can be re-applied to different recipients later).
    const signerIdToRoleIdx = new Map(recipients.map((r, i) => [r.id, i]));
    const templateFields = fields.map(f => ({
      type: f.type,
      page: f.page,
      x: f.x, y: f.y, w: f.w, h: f.h,
      role_index: signerIdToRoleIdx.get(f.signer_id) ?? 0,
    }));

    const created = await db.createTemplate(user.id, {
      name,
      description,
      pages: pages?.length ?? env.pages ?? 1,
      signerRoles: roles,
      fields: templateFields,
      pdf_url: templatePdfUrl,
      original_pdf_sha256: env.original_pdf_sha256 || null,
    });

    setTemplates?.(prev => [
      {
        ...created,
        signerRoles: created.signer_roles,
        createdAt: created.created_at,
        usageCount: created.usage_count,
      },
      ...(prev || []),
    ]);

    setShowSaveTemplate(false);
    notify?.("Template saved. Find it on the Templates page.");
  }

  // ── Guard rails ──
  if (!env) return <Navigate to="/" replace />;

  if (isMobile) {
    return <MobileFallback envelopeName={env.name} navigate={navigate} />;
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

      {/* Top bar (matches AppShell visually) */}
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
            onClick={() => navigate("/")}
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
              onClick={() => navigate("/")}
              style={{ cursor: "pointer", textDecoration: "none" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.ink; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
            >
              Documents
            </span>
            <span style={{ margin: "0 6px" }}>›</span>
            <span style={{ color: C.ink, fontWeight: 500 }}>{env.name}</span>
            <span style={{ margin: "0 6px" }}>·</span>
            <span>Prepare</span>
          </span>
        </div>
        <div style={{ fontSize: 13, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {user?.email}
        </div>
      </header>

      {/* Main row: sidebar + canvas */}
      <div
        style={{
          marginTop: TOP_BAR_HEIGHT,
          display: "flex",
          height: `calc(100vh - ${TOP_BAR_HEIGHT}px)`,
          minHeight: 0,
        }}
      >
        <PrepareSidebar
          envelopeName={env.name}
          pageCount={pages?.length ?? env.pages ?? 0}
          recipients={recipients}
          activeRecipientId={activeRecipientId}
          setActiveRecipientId={setActiveRecipientId}
          onBack={() => navigate("/")}
          onSaveTemplate={handleSaveTemplate}
          onSend={handleSend}
          sendDisabled={!sendValidation.ok}
          sendDisabledReason={sendValidation.reason}
        />

        <DocumentCanvas
          pages={pages || []}
          pageNaturalSizes={pageNaturalSizes || []}
          fields={fields}
          recipients={recipients}
          activeRecipientId={activeRecipientId}
          selectedFieldId={selectedFieldId}
          setSelectedFieldId={setSelectedFieldId}
          saveStatus={saveStatus}
          onCreateField={handleCreateField}
          onUpdateField={handleUpdateField}
          onDeleteField={handleDeleteField}
          onDuplicateField={handleDuplicateField}
        />
      </div>

      {/* Save-as-Template modal */}
      {showSaveTemplate && (
        <SaveTemplateModal
          signers={recipients}
          onCancel={() => setShowSaveTemplate(false)}
          onSave={handleConfirmSaveTemplate}
        />
      )}

      {/* Tier limit upgrade prompt */}
      {upgradeKind && (
        <UpgradePromptModal kind={upgradeKind} onClose={() => setUpgradeKind(null)} />
      )}

      {/* Onboarding overlay */}
      {showOnboarding && fields.length === 0 && pages?.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: TOP_BAR_HEIGHT + 240,
            left: 280 + 20,
            zIndex: 40,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              width: 0, height: 0,
              borderTop: "8px solid transparent",
              borderBottom: "8px solid transparent",
              borderRight: `12px solid ${C.forest}`,
            }}
          />
          <div
            style={{
              background: C.forest,
              color: C.paper,
              padding: "8px 14px",
              borderRadius: 6,
              fontFamily: FONT_SANS,
              fontSize: 13,
              fontWeight: 500,
              boxShadow: "0 4px 12px rgba(15,20,24,0.12)",
            }}
          >
            Drag a field type onto the document to place it.
          </div>
        </div>
      )}
    </div>
  );
}

// ───────────────── Helpers ─────────────────

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

// Normalize fields coming in from the envelope detail (DB-shaped).
function normalizeField(f) {
  return {
    id: f.id,
    envelope_id: f.envelope_id,
    page: f.page ?? 0,
    x: Number(f.x), y: Number(f.y), w: Number(f.w), h: Number(f.h),
    type: f.type,
    signer_id: f.signer_id ?? null,
    value: f.value ?? null,
  };
}

function validateForSend(recipients, fields) {
  if (recipients.length === 0) return { ok: false, reason: "Add at least one signer." };
  if (fields.length === 0) return { ok: false, reason: "Place at least one field on the document." };
  // Each signer-type recipient needs ≥1 signature field
  for (const r of recipients) {
    const hasSig = fields.some(f => f.signer_id === r.id && f.type === "signature");
    if (!hasSig) return { ok: false, reason: `${r.name || r.email || "Each signer"} needs at least one signature field.` };
  }
  return { ok: true, reason: "" };
}

// ───────────────── Mobile fallback ─────────────────

function MobileFallback({ envelopeName, navigate }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paperWarm,
        color: C.ink,
        fontFamily: FONT_SANS,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        textAlign: "center",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <LogoMark size={36} color={C.forest} />
      </div>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 26,
          fontWeight: 600,
          color: C.ink,
          margin: "0 0 12px",
          letterSpacing: "-0.01em",
        }}
      >
        Open this on a larger screen.
      </h1>
      <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.55, maxWidth: 420, margin: "0 0 28px" }}>
        Field placement works best on a desktop or tablet. The precision needed for signature fields on a contract isn't comfortable on a phone — open Sign Flow on a bigger screen, or save this envelope as a draft and finish later.
      </p>
      <p style={{ fontSize: 12, color: C.muted, margin: "0 0 8px" }}>
        Currently editing
      </p>
      <p style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600, color: C.ink, margin: "0 0 32px" }}>
        {envelopeName}
      </p>
      <button
        type="button"
        onClick={() => navigate("/")}
        style={{
          padding: "11px 20px",
          background: C.forest,
          color: C.paper,
          border: "none",
          borderRadius: 6,
          fontFamily: FONT_SANS,
          fontSize: 14,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Save as draft and exit
      </button>
    </div>
  );
}
