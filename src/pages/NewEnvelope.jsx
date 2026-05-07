import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocTitle } from "../utils";
import { TemplatePickerModal } from "../components/TemplatePickerModal";

const C = {
  paper:       "#FAFAF7",
  paperWarm:   "#F2F2EE",
  paperHover:  "#EAEAE6",
  ink:         "#0F1418",
  muted:       "#5A6168",
  soft:        "#8A8A82",
  forest:      "#1E5128",
  forestDark:  "#163E1F",
  forestSoft:  "rgba(30, 81, 40, 0.08)",
  border:      "#E0E0DC",
  borderDark:  "#B8B6AB",
  errorBg:     "#FCEBEB",
  errorBorder: "#F0B5B5",
  errorText:   "#A32D2D",
};

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

const STEPS = [
  { id: "document",   label: "Document"   },
  { id: "recipients", label: "Recipients" },
  { id: "details",    label: "Details"    },
];

const ACTION_BAR_HEIGHT = 72;
const SIDEBAR_WIDTH = 240; // matches AppShell

const PDF_MIME = "application/pdf";

function emailValid(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((s || "").trim());
}

// A row is "empty" when neither name nor email has content. Auto-add appends
// a blank row when the user tabs out of the last row, so validation must
// ignore those — otherwise the trailing blank row blocks the Next button.
function rowIsEmpty(r) {
  return !r.name.trim() && !r.email.trim();
}

function suggestNameFromFile(file) {
  if (!file) return "";
  const base = file.name.replace(/\.pdf$/i, "");
  return base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function randomCode(len = 6) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // skip 0/O/1/I
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

function expirationDateFromChoice(choice) {
  if (!choice || choice === "never" || choice === "custom") return null;
  const days = parseInt(choice, 10);
  if (isNaN(days)) return null;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function cryptoId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "r" + Math.random().toString(36).slice(2, 10);
}

export function NewEnvelope({ templates = [], onCreate }) {
  useDocTitle("New Envelope");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedTemplateId = searchParams.get("template");

  // ── State ──
  const [step, setStep] = useState(0);

  // Step 1: document
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [selTmpl, setSelTmpl] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileRef = useRef(null);

  // If ?template=<id> in the URL, preselect it on mount.
  useEffect(() => {
    if (!preselectedTemplateId) return;
    const t = (templates || []).find(x => x.id === preselectedTemplateId);
    if (t) applyTemplate(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedTemplateId, templates]);

  function applyTemplate(t) {
    setSelTmpl(t);
    setPickerOpen(false);
    // Pre-fill recipients with one row per role, role name as a placeholder hint.
    const roles = t.signerRoles || t.signer_roles || [];
    if (roles.length > 0) {
      setRecipients(roles.map(roleName => ({
        id: cryptoId(),
        name: "",
        email: "",
        recipient_type: "signer",
        roleName,
      })));
    }
    if (!name.trim()) setName(t.name || "");
  }
  function clearTemplate() {
    setSelTmpl(null);
    setRecipients([{ id: cryptoId(), name: "", email: "", recipient_type: "signer" }]);
  }

  // Step 2: recipients
  const [signOrder, setSignOrder] = useState(true);
  const [recipients, setRecipients] = useState([
    { id: cryptoId(), name: "", email: "", recipient_type: "signer" },
  ]);

  // Step 3: details
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [accessCodeEnabled, setAccessCodeEnabled] = useState(false);
  const [accessCode, setAccessCode] = useState(randomCode());
  const [expiration, setExpiration] = useState("never");
  const [reminderSchedule, setReminderSchedule] = useState("none");

  // Submission state
  const [submitting, setSubmitting] = useState(false);

  // Load pdf.js for client-side page rendering (matches the existing pattern).
  useEffect(() => {
    if (window.pdfjsLib) return;
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    };
    document.head.appendChild(script);
  }, []);

  // ── File processing ──

  async function processPdfBytes(arrayBuffer) {
    if (!window.pdfjsLib) {
      setPdfError("PDF reader still loading. Try again in a moment.");
      return null;
    }
    try {
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
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
      return pageImages;
    } catch (err) {
      console.error(err);
      setPdfError("Failed to read PDF. The file may be encrypted or corrupted.");
      return null;
    }
  }

  async function processFile(file) {
    if (!file) return;
    setPdfError(null);

    if (file.type !== PDF_MIME) {
      setPdfError("Sign Flow accepts PDF only. Most word processors can save documents as PDF — try that.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPdfError("File must be under 20MB");
      return;
    }

    setPdfFile(file);
    if (!name.trim()) setName(suggestNameFromFile(file));
    setPdfLoading(true);
    const arrayBuffer = await file.arrayBuffer();
    const pages = await processPdfBytes(arrayBuffer);
    setPdfLoading(false);
    if (pages) setPdfPages(pages);
  }

  function clearFile() {
    setPdfFile(null);
    setPdfPages(null);
    setPdfError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Recipients ──

  function updateRecipient(id, patch) {
    setRecipients(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRecipient(id) {
    setRecipients(rs => (rs.length > 1 ? rs.filter(r => r.id !== id) : rs));
  }
  function addRecipient() {
    setRecipients(rs => [...rs, { id: cryptoId(), name: "", email: "", recipient_type: "signer" }]);
  }
  function moveRecipient(fromIdx, toIdx) {
    if (fromIdx === toIdx) return;
    setRecipients(rs => {
      const copy = [...rs];
      const [item] = copy.splice(fromIdx, 1);
      copy.splice(toIdx, 0, item);
      return copy;
    });
  }

  // ── Validation ──

  const step1Valid = !!selTmpl || (!!pdfFile && !!pdfPages && !pdfLoading);
  const filledRecipients = recipients.filter(r => !rowIsEmpty(r));
  const step2Valid = filledRecipients.length > 0
    && filledRecipients.every(r => r.name.trim() && emailValid(r.email))
    && filledRecipients.some(r => r.recipient_type === "signer");
  const step3Valid = name.trim().length > 0;
  const canAdvance = step === 0 ? step1Valid : step === 1 ? step2Valid : step3Valid;

  const disabledReason = useMemo(() => {
    if (canAdvance) return undefined;
    if (step === 0) return "Upload a PDF or pick a template to continue";
    if (step === 1) {
      const filled = recipients.filter(r => !rowIsEmpty(r));
      if (filled.length === 0) return "Add at least one recipient";
      if (!filled.every(r => r.name.trim() && emailValid(r.email))) return "Fix the highlighted recipient errors above";
      if (!filled.some(r => r.recipient_type === "signer")) return "At least one recipient must be marked Needs to sign";
      return "Fix the highlighted recipient errors above";
    }
    return "Give the envelope a name to continue";
  }, [canAdvance, step, recipients]);

  function goNext() {
    if (!canAdvance || submitting) return;
    if (step < 2) { setStep(s => s + 1); return; }
    submit();
  }
  function goBack() { if (step > 0) setStep(s => s - 1); }
  function jumpTo(target) { if (target < step) setStep(target); }

  // ── Submit ──

  async function submit() {
    if (!step3Valid) return;
    if (!selTmpl && (!pdfFile || !pdfPages)) return;
    setSubmitting(true);

    // Drop trailing/blank rows from auto-add before persisting.
    const finalSigners = recipients
      .filter(r => !rowIsEmpty(r))
      .map((r, i) => ({
        name: r.name.trim(),
        email: r.email.trim(),
        role: r.recipient_type === "cc" ? "Copy" : "Signer",
        recipient_type: r.recipient_type,
        sort_order: i,
        ...(accessCodeEnabled && r.recipient_type === "signer" ? { access_code: accessCode } : {}),
      }));

    try {
      await onCreate({
        name: name.trim(),
        pages: selTmpl ? selTmpl.pages : pdfPages.length,
        routing: signOrder ? "sequential" : "parallel",
        pdfFile,
        pdfPages,
        signers: finalSigners,
        expires_at: expirationDateFromChoice(expiration),
        message: message.trim() || null,
        reminder_schedule: reminderSchedule,
        template: selTmpl
          ? {
              id: selTmpl.id,
              name: selTmpl.name,
              pdf_url: selTmpl.pdf_url,
              original_pdf_sha256: selTmpl.original_pdf_sha256,
              fields: selTmpl.fields || [],
              usage_count: selTmpl.usage_count ?? selTmpl.usageCount ?? 0,
            }
          : null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render ──

  const ctaLabel = useMemo(() => {
    if (step === 0) return "Next: Recipients";
    if (step === 1) return "Next: Details";
    return submitting ? "Creating…" : "Continue to placement →";
  }, [step, submitting]);

  return (
    <div style={{ fontFamily: FONT_SANS, paddingBottom: ACTION_BAR_HEIGHT + 24 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 880px) {
          .ne-actionbar { left: 0 !important; padding: 0 20px !important; }
          .ne-card { padding: 32px !important; }
          .ne-recipient-grid { grid-template-columns: 1fr !important; }
        }
        .ne-cta:hover:not(:disabled) { background: ${C.forestDark}; transform: translateY(-1px); }
        .ne-cta:active:not(:disabled) { transform: translateY(0); }
        .ne-cta:disabled { opacity: 0.5; cursor: not-allowed; }
        .ne-back:hover { color: ${C.forest}; }
        .ne-step.is-clickable { cursor: pointer; }
        .ne-step.is-clickable:hover .ne-step-label { color: ${C.forest}; }
        .ne-input:focus { outline: none; border-color: ${C.forest}; box-shadow: 0 0 0 3px rgba(30,81,40,0.1); }
        .ne-rm-btn:hover { color: ${C.errorText}; }
        .ne-add-btn:hover { border-color: ${C.forest}; color: ${C.forest}; background: ${C.forestSoft}; }
        .ne-toggle-input:checked + .ne-toggle-track { background: ${C.forest}; }
        .ne-toggle-input:checked + .ne-toggle-track .ne-toggle-thumb { transform: translateX(18px); }
        .ne-recipient-row[draggable="true"] .ne-grip { cursor: grab; }
        .ne-recipient-row[draggable="true"] .ne-grip:active { cursor: grabbing; }
        .ne-recipient-row.is-drag-target { background: ${C.paperWarm}; }
        .ne-link:hover { text-decoration: underline; }
      `}</style>

      <Stepper step={step} onJump={jumpTo} canAdvance={canAdvance} />

      {step === 0 && (
        <DocumentStep
          pdfFile={pdfFile}
          pdfPages={pdfPages}
          pdfLoading={pdfLoading}
          pdfError={pdfError}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onProcessFile={processFile}
          onClear={clearFile}
          fileRef={fileRef}
          templates={templates}
          selTmpl={selTmpl}
          onPickTemplate={() => setPickerOpen(true)}
          onClearTemplate={clearTemplate}
        />
      )}

      {pickerOpen && (
        <TemplatePickerModal
          templates={templates || []}
          onCancel={() => setPickerOpen(false)}
          onSelect={applyTemplate}
        />
      )}

      {step === 1 && (
        <RecipientsStep
          signOrder={signOrder}
          setSignOrder={setSignOrder}
          recipients={recipients}
          updateRecipient={updateRecipient}
          removeRecipient={removeRecipient}
          addRecipient={addRecipient}
          moveRecipient={moveRecipient}
        />
      )}

      {step === 2 && (
        <DetailsStep
          name={name} setName={setName}
          message={message} setMessage={setMessage}
          advancedOpen={advancedOpen} setAdvancedOpen={setAdvancedOpen}
          accessCodeEnabled={accessCodeEnabled} setAccessCodeEnabled={setAccessCodeEnabled}
          accessCode={accessCode} setAccessCode={setAccessCode}
          expiration={expiration} setExpiration={setExpiration}
          reminderSchedule={reminderSchedule} setReminderSchedule={setReminderSchedule}
          fileNameHint={pdfFile ? suggestNameFromFile(pdfFile) : ""}
        />
      )}

      <ActionBar
        showBack={step > 0}
        onBack={goBack}
        ctaLabel={ctaLabel}
        onAdvance={goNext}
        canAdvance={canAdvance}
        submitting={submitting}
        disabledReason={disabledReason}
      />
    </div>
  );
}

// ───────────────── Module-level subcomponents ─────────────────
// Defined outside the main component so their identity is stable across
// renders (otherwise input focus is lost on every keystroke).

function Stepper({ step, onJump, canAdvance }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", margin: "0 auto 40px", maxWidth: 700 }}>
      <div style={{ display: "flex", alignItems: "center", width: "100%", justifyContent: "space-between" }}>
        {STEPS.map((s, i) => {
          const status = i < step ? "complete" : i === step ? "active" : "pending";
          const isClickable = i < step;
          return (
            <div key={s.id} style={{ display: "flex", alignItems: "center", flex: i === STEPS.length - 1 ? "0 0 auto" : 1 }}>
              <div
                className={`ne-step ${isClickable ? "is-clickable" : ""}`}
                onClick={() => isClickable && onJump(i)}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}
              >
                <div
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: status === "pending" ? "transparent" : C.forest,
                    border: status === "pending" ? `1.5px solid ${C.borderDark}` : "none",
                    color: status === "pending" ? C.muted : C.paper,
                    fontFamily: FONT_SANS,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {status === "complete" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : i + 1}
                </div>
                <span
                  className="ne-step-label"
                  style={{
                    fontFamily: FONT_SANS,
                    fontSize: 12,
                    fontWeight: status === "active" ? 600 : 500,
                    color: status === "active" ? C.ink : status === "complete" ? C.forest : C.muted,
                    transition: "color 150ms ease",
                  }}
                >
                  {s.label}
                </span>
              </div>
              {i !== STEPS.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: 1.5,
                    background: i < step ? C.forest : C.border,
                    margin: "0 12px",
                    marginBottom: 28,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Card({ children }) {
  return (
    <div
      className="ne-card"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        background: C.paper,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: 48,
      }}
    >
      {children}
    </div>
  );
}

function DocumentStep({ pdfFile, pdfPages, pdfLoading, pdfError, dragOver, setDragOver, onProcessFile, onClear, fileRef, templates, selTmpl, onPickTemplate, onClearTemplate }) {
  const hasFile = !!pdfFile;
  const hasTemplates = (templates || []).length > 0;
  const usingTemplate = !!selTmpl;

  return (
    <Card>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Pick a document
        </h2>
        <p style={{ fontSize: 14, color: C.muted, margin: 0, lineHeight: 1.5 }}>
          Upload a PDF to start a new envelope.
        </p>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onProcessFile(f);
        }}
        style={{
          display: "block",
          border: `${dragOver ? 2 : 1.5}px ${dragOver ? "solid" : "dashed"} ${dragOver ? C.forest : C.borderDark}`,
          borderRadius: 8,
          padding: hasFile ? "20px 24px" : "44px 24px",
          textAlign: "center",
          background: dragOver ? C.paperWarm : "transparent",
          cursor: "pointer",
          transition: "background 150ms ease, border-color 150ms ease, padding 150ms ease",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept={PDF_MIME}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onProcessFile(f); }}
          style={{ display: "none" }}
        />
        {!hasFile && !pdfLoading && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: "inline-block" }}>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <path d="M17 8l-5-5-5 5" />
                <path d="M12 3v12" />
              </svg>
            </div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
              Upload a document
            </div>
            <div style={{ fontSize: 14, color: C.muted }}>
              PDF, up to 20MB
            </div>
          </div>
        )}
        {pdfLoading && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color: C.muted }}>
            <Spinner /> Reading pages…
          </div>
        )}
        {hasFile && !pdfLoading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.forest, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {pdfFile.name}
                </div>
                <div style={{ fontSize: 12, color: C.muted }}>
                  {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                  {pdfPages && ` · ${pdfPages.length} ${pdfPages.length === 1 ? "page" : "pages"}`}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); onClear(); }}
              className="ne-link"
              style={{ background: "transparent", border: "none", color: C.forest, fontWeight: 600, fontSize: 13, cursor: "pointer", flexShrink: 0 }}
            >
              Replace
            </button>
          </div>
        )}
      </label>

      {pdfError && (
        <div
          style={{
            marginTop: 12, padding: "10px 14px", fontSize: 13,
            background: C.errorBg, color: C.errorText,
            border: `1px solid ${C.errorBorder}`, borderRadius: 6,
          }}
        >
          {pdfError}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "28px 0 16px" }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 11, color: C.soft, letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 600 }}>or</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>

      {usingTemplate ? (
        <div
          style={{
            padding: "14px 16px",
            background: "rgba(30, 81, 40, 0.06)",
            border: `1px solid ${C.forest}`,
            borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "space-between",
            gap: 16,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: C.forest, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 4 }}>
              Using template
            </div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 16, fontWeight: 600, color: C.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selTmpl.name}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
              {(selTmpl.signerRoles || selTmpl.signer_roles || []).length} roles · {(selTmpl.fields || []).length} fields
            </div>
          </div>
          <button
            type="button"
            onClick={onClearTemplate}
            style={{
              background: "transparent", border: "none",
              color: C.forest, fontWeight: 600, fontSize: 13,
              cursor: "pointer", flexShrink: 0,
            }}
          >
            Change
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={!hasTemplates}
          title={!hasTemplates ? "No templates yet — save one from the prepare screen" : "Pick a template"}
          onClick={onPickTemplate}
          style={{
            width: "100%", padding: "12px 18px",
            background: "transparent",
            color: hasTemplates ? C.ink : C.soft,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
            cursor: hasTemplates ? "pointer" : "not-allowed",
            transition: "border-color 150ms ease, color 150ms ease",
          }}
        >
          Use a template
        </button>
      )}
    </Card>
  );
}

function signerIndexAt(recipients, idx) {
  if (recipients[idx].recipient_type !== "signer") return null;
  let n = 0;
  for (let i = 0; i <= idx; i++) {
    if (recipients[i].recipient_type === "signer") n++;
  }
  return n;
}

function RecipientsStep({ signOrder, setSignOrder, recipients, updateRecipient, removeRecipient, addRecipient, moveRecipient }) {
  function maybeAutoAdd(idx) {
    const last = recipients[recipients.length - 1];
    if (idx === recipients.length - 1 && last && last.name.trim() && emailValid(last.email)) {
      addRecipient();
    }
  }

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8, gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: C.ink, margin: 0, letterSpacing: "-0.01em" }}>
          Recipients
        </h2>
        <SignOrderToggle signOrder={signOrder} setSignOrder={setSignOrder} />
      </div>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
        {signOrder
          ? "Recipients sign one at a time, in the order shown. Each signer is notified after the previous one signs."
          : "All signers receive the email at the same time. They can sign in any order."}
      </p>

      <div>
        {recipients.map((r, i) => (
          <RecipientRow
            key={r.id}
            row={r}
            index={i}
            signerIndex={signerIndexAt(recipients, i)}
            signOrder={signOrder}
            canRemove={recipients.length > 1}
            onChange={(patch) => updateRecipient(r.id, patch)}
            onRemove={() => removeRecipient(r.id)}
            onAutoAdd={() => maybeAutoAdd(i)}
            onMove={(toIdx) => moveRecipient(i, toIdx)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addRecipient}
        className="ne-add-btn"
        style={{
          width: "100%", padding: "12px",
          background: "transparent",
          color: C.muted,
          border: `1px dashed ${C.borderDark}`,
          borderRadius: 6,
          fontFamily: FONT_SANS, fontSize: 13, fontWeight: 600,
          cursor: "pointer",
          marginTop: 16,
          transition: "border-color 150ms ease, color 150ms ease, background 150ms ease",
        }}
      >
        + Add another recipient
      </button>
    </Card>
  );
}

function SignOrderToggle({ signOrder, setSignOrder }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", flexShrink: 0 }}>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.ink }}>Sign in order</span>
      <span style={{ position: "relative", display: "inline-block", width: 36, height: 20 }}>
        <input
          type="checkbox"
          className="ne-toggle-input"
          checked={signOrder}
          onChange={(e) => setSignOrder(e.target.checked)}
          style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
        />
        <span
          className="ne-toggle-track"
          style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.borderDark, transition: "background 150ms ease" }}
        >
          <span
            className="ne-toggle-thumb"
            style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", background: C.paper, transition: "transform 150ms ease" }}
          />
        </span>
      </span>
    </label>
  );
}

function RecipientRow({ row, index, signerIndex, signOrder, canRemove, onChange, onRemove, onAutoAdd, onMove }) {
  const [over, setOver] = useState(false);
  const isSigner = row.recipient_type === "signer";
  const showNumberBadge = isSigner && signOrder && signerIndex != null;

  // Inline validation: only surface errors once the user has typed in this row,
  // so empty/auto-added trailing rows stay quiet.
  const hasContent   = !!(row.name.trim() || row.email.trim());
  const nameError    = hasContent && !row.name.trim();
  const emailMissing = hasContent && !row.email.trim();
  const emailFormat  = hasContent && !!row.email.trim() && !emailValid(row.email);

  return (
    <div
      className={`ne-recipient-row ${over ? "is-drag-target" : ""}`}
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("text/plain", String(index)); e.dataTransfer.effectAllowed = "move"; }}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const fromIdx = parseInt(e.dataTransfer.getData("text/plain"), 10);
        if (!isNaN(fromIdx) && fromIdx !== index) onMove(index);
      }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "16px 0",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <span
        className="ne-grip"
        style={{ display: "inline-flex", alignItems: "center", color: C.soft, paddingTop: 6 }}
        aria-label="Drag to reorder"
      >
        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="3" r="1.2" /><circle cx="9" cy="3" r="1.2" />
          <circle cx="3" cy="8" r="1.2" /><circle cx="9" cy="8" r="1.2" />
          <circle cx="3" cy="13" r="1.2" /><circle cx="9" cy="13" r="1.2" />
        </svg>
      </span>

      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        {showNumberBadge ? (
          <div
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: C.forest, color: C.paper,
              fontFamily: FONT_SANS, fontSize: 12, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {signerIndex}
          </div>
        ) : (
          <div
            title={isSigner ? "Signer (parallel)" : "Receives a copy"}
            style={{
              width: 28, height: 28, borderRadius: "50%",
              background: C.paperWarm,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: C.muted,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <path d="M22 6l-10 7L2 6" />
            </svg>
          </div>
        )}
      </div>

      <div className="ne-recipient-grid" style={{ flex: 1, minWidth: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {row.roleName && (
          <div
            style={{
              gridColumn: "1 / -1",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: C.forest,
              marginBottom: -4,
            }}
          >
            {row.roleName}
          </div>
        )}
        <div>
          <input
            className="ne-input"
            type="text"
            placeholder={row.roleName ? `Person who will fill the ${row.roleName} role — name` : "Full name"}
            value={row.name}
            onChange={(e) => onChange({ name: e.target.value })}
            style={{ ...inputStyle(), width: "100%", ...(nameError ? { borderColor: C.errorBorder } : {}) }}
            aria-invalid={nameError || undefined}
          />
          {nameError && <FieldError>Name is required</FieldError>}
        </div>
        <div>
          <input
            className="ne-input"
            type="email"
            placeholder="Email address"
            value={row.email}
            onChange={(e) => onChange({ email: e.target.value })}
            onBlur={onAutoAdd}
            style={{ ...inputStyle(), width: "100%", ...((emailMissing || emailFormat) ? { borderColor: C.errorBorder } : {}) }}
            aria-invalid={emailMissing || emailFormat || undefined}
          />
          {emailFormat && <FieldError>Enter a valid email address</FieldError>}
          {emailMissing && !emailFormat && <FieldError>Email is required</FieldError>}
        </div>
        <select
          className="ne-input"
          value={row.recipient_type}
          onChange={(e) => onChange({ recipient_type: e.target.value })}
          style={{ ...inputStyle(), gridColumn: "1 / -1" }}
        >
          <option value="signer">Needs to sign</option>
          <option value="cc">Receives a copy</option>
        </select>
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ne-rm-btn"
          aria-label="Remove recipient"
          style={{
            background: "transparent", border: "none", color: C.soft,
            cursor: "pointer", padding: 6, marginTop: 4,
            transition: "color 150ms ease",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function DetailsStep({
  name, setName, message, setMessage,
  advancedOpen, setAdvancedOpen,
  accessCodeEnabled, setAccessCodeEnabled,
  accessCode, setAccessCode,
  expiration, setExpiration,
  reminderSchedule, setReminderSchedule,
  fileNameHint,
}) {
  return (
    <Card>
      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 24px", letterSpacing: "-0.01em" }}>
        Details
      </h2>

      <div>
        <SectionLabel>Envelope name</SectionLabel>
        <input
          className="ne-input"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={fileNameHint || "e.g. Lease Agreement 2024"}
          style={{ ...inputStyle(), width: "100%" }}
        />
        <p style={{ fontSize: 12, color: C.soft, margin: "6px 0 0" }}>
          This is what recipients will see in their email. Make it descriptive.
        </p>
      </div>

      <SectionDivider />

      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <SectionLabel inline>Message</SectionLabel>
          <OptionalBadge />
        </div>
        <textarea
          className="ne-input"
          value={message}
          onChange={(e) => { if (e.target.value.length <= 500) setMessage(e.target.value); }}
          placeholder="Add a note (optional). This appears in the signing email."
          rows={3}
          style={{ ...inputStyle(), width: "100%", resize: "vertical", fontFamily: FONT_SANS, lineHeight: 1.5 }}
        />
        <div style={{ textAlign: "right", fontSize: 11, color: C.soft, marginTop: 4 }}>
          {message.length} / 500
        </div>
      </div>

      <SectionDivider />

      <div>
        <button
          type="button"
          onClick={() => setAdvancedOpen(o => !o)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            width: "100%", background: "transparent", border: "none",
            padding: 0, cursor: "pointer",
            fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, color: C.ink,
          }}
        >
          <span>Advanced options</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: advancedOpen ? "rotate(180deg)" : "none", transition: "transform 200ms ease" }}>
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>

        {advancedOpen && (
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <SectionLabel inline>Access code</SectionLabel>
                <OptionalBadge />
              </div>
              <p style={{ fontSize: 12, color: C.muted, margin: "0 0 10px", lineHeight: 1.5 }}>
                Require recipients to enter a code before they can view the document. Share the code separately (text, phone, etc.).
              </p>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: "pointer", marginBottom: 10 }}>
                <span style={{ position: "relative", display: "inline-block", width: 36, height: 20 }}>
                  <input
                    type="checkbox"
                    className="ne-toggle-input"
                    checked={accessCodeEnabled}
                    onChange={(e) => setAccessCodeEnabled(e.target.checked)}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                  />
                  <span
                    className="ne-toggle-track"
                    style={{ position: "absolute", inset: 0, borderRadius: 999, background: C.borderDark, transition: "background 150ms ease" }}
                  >
                    <span
                      className="ne-toggle-thumb"
                      style={{ position: "absolute", top: 2, left: 2, width: 16, height: 16, borderRadius: "50%", background: C.paper, transition: "transform 150ms ease" }}
                    />
                  </span>
                </span>
                <span style={{ fontSize: 13, color: C.ink }}>
                  {accessCodeEnabled ? "Enabled" : "Off"}
                </span>
              </label>
              {accessCodeEnabled && (
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    className="ne-input"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    style={{ ...inputStyle(), flex: 1, fontFamily: "ui-monospace, Menlo, monospace", letterSpacing: "0.1em" }}
                  />
                  <button
                    type="button"
                    onClick={() => setAccessCode(randomCode())}
                    className="ne-link"
                    style={{ background: "transparent", border: "none", color: C.forest, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Generate new
                  </button>
                </div>
              )}
            </div>

            <div>
              <SectionLabel>Expires after</SectionLabel>
              <select
                className="ne-input"
                value={expiration}
                onChange={(e) => setExpiration(e.target.value)}
                style={{ ...inputStyle(), width: "100%" }}
              >
                <option value="never">Never (default)</option>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
                <option value="custom">Custom…</option>
              </select>
              {expiration === "custom" && (
                <p style={{ fontSize: 12, color: C.soft, margin: "6px 0 0", fontStyle: "italic" }}>
                  Custom date picker coming soon — for now this falls back to "Never".
                </p>
              )}
            </div>

            <div>
              <SectionLabel>Send reminders</SectionLabel>
              <select
                className="ne-input"
                value={reminderSchedule}
                onChange={(e) => setReminderSchedule(e.target.value)}
                style={{ ...inputStyle(), width: "100%" }}
              >
                <option value="none">No reminders (default)</option>
                <option value="3-once">Once after 3 days</option>
                <option value="3-recurring">Every 3 days until signed</option>
              </select>
              <p style={{ fontSize: 12, color: C.soft, margin: "6px 0 0", fontStyle: "italic" }}>
                Reminder delivery isn't wired up yet — your preference is captured for when it ships.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

function ActionBar({ showBack, onBack, ctaLabel, onAdvance, canAdvance, submitting, disabledReason }) {
  return (
    <div
      className="ne-actionbar"
      style={{
        position: "fixed",
        left: SIDEBAR_WIDTH, right: 0, bottom: 0,
        height: ACTION_BAR_HEIGHT,
        background: C.paper,
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        zIndex: 30,
      }}
    >
      {showBack ? (
        <button
          type="button"
          onClick={onBack}
          className="ne-back"
          style={{
            background: "transparent", border: "none", padding: "8px 0",
            color: C.muted, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500,
            cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            transition: "color 150ms ease",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      ) : <span />}

      <button
        type="button"
        onClick={onAdvance}
        disabled={!canAdvance || submitting}
        title={!canAdvance && !submitting ? disabledReason : undefined}
        className="ne-cta"
        style={{
          padding: "11px 20px",
          background: C.forest, color: C.paper,
          border: "none", borderRadius: 6,
          fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
          letterSpacing: "0.01em", cursor: "pointer",
          transition: "background 150ms ease, transform 80ms ease",
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

function SectionDivider() {
  return <div style={{ height: 1, background: C.border, margin: "28px 0" }} />;
}

function SectionLabel({ children, inline = false }) {
  return (
    <div
      style={{
        display: inline ? "inline-block" : "block",
        fontFamily: FONT_SANS,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: inline ? 0 : 8,
      }}
    >
      {children}
    </div>
  );
}

function OptionalBadge() {
  return (
    <span
      style={{
        fontSize: 10, fontWeight: 600,
        color: C.soft, letterSpacing: "0.04em", textTransform: "uppercase",
        padding: "2px 6px", background: C.paperWarm, borderRadius: 4,
      }}
    >
      Optional
    </span>
  );
}

function inputStyle() {
  return {
    boxSizing: "border-box",
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    background: C.paper,
    fontSize: 14,
    color: C.ink,
    outline: "none",
    fontFamily: FONT_SANS,
    transition: "border-color 140ms ease, box-shadow 140ms ease",
  };
}

function FieldError({ children }) {
  return (
    <div style={{ marginTop: 4, fontSize: 12, color: C.errorText, lineHeight: 1.3 }}>
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: "inline-block", width: 14, height: 14, borderRadius: "50%",
        border: `1.8px solid ${C.border}`, borderTopColor: C.forest,
        animation: "spin 0.8s linear infinite",
      }}
    />
  );
}
