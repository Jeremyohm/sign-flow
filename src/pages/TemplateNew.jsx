import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDocTitle } from "../utils";

const C = {
  paper:       "#FAFAF7",
  paperWarm:   "#F2F2EE",
  ink:         "#0F1418",
  muted:       "#5A6168",
  soft:        "#8A8A82",
  forest:      "#1E5128",
  forestDark:  "#163E1F",
  border:      "#E0E0DC",
  borderDark:  "#B8B6AB",
  errorBg:     "#FCEBEB",
  errorBorder: "#F0B5B5",
  errorText:   "#A32D2D",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

const PDF_MIME = "application/pdf";
const ACTION_BAR_HEIGHT = 72;
const SIDEBAR_WIDTH = 240;

// Step 1 of standalone template creation. Captures a PDF + name + description,
// then hands off to TemplateEditor (mode='create') via location.state.
export function TemplateNew() {
  useDocTitle("New Template");
  const navigate = useNavigate();

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfError, setPdfError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const fileRef = useRef(null);

  function processFile(file) {
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
    if (!name.trim()) {
      const base = file.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
      setName(base);
    }
  }

  function clearFile() {
    setPdfFile(null);
    setPdfError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const canContinue = !!pdfFile && !!name.trim();

  function handleContinue() {
    if (!canContinue) return;
    navigate("/templates/new/place", {
      state: {
        pdfFile,
        templateName: name.trim(),
        templateDescription: description.trim(),
      },
    });
  }

  return (
    <div style={{ fontFamily: FONT_SANS, paddingBottom: ACTION_BAR_HEIGHT + 24 }}>
      <style>{`
        @media (max-width: 880px) {
          .tn-actionbar { left: 0 !important; padding: 0 20px !important; }
          .tn-card { padding: 32px !important; }
        }
        .tn-cta:hover:not(:disabled) { background: ${C.forestDark}; transform: translateY(-1px); }
        .tn-cta:active:not(:disabled) { transform: translateY(0); }
        .tn-cta:disabled { opacity: 0.5; cursor: not-allowed; }
        .tn-input:focus { outline: none; border-color: ${C.forest}; box-shadow: 0 0 0 3px rgba(30,81,40,0.1); }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div className="tn-card" style={{ background: C.paper, border: `1px solid ${C.border}`, borderRadius: 8, padding: 48 }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600, color: C.ink, margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            New template
          </h2>
          <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", lineHeight: 1.5 }}>
            Upload a PDF and name your template. You'll place fields in the next step.
          </p>

          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const f = e.dataTransfer.files?.[0];
              if (f) processFile(f);
            }}
            style={{
              display: "block",
              border: `${dragOver ? 2 : 1.5}px ${dragOver ? "solid" : "dashed"} ${dragOver ? C.forest : C.borderDark}`,
              borderRadius: 8,
              padding: pdfFile ? "20px 24px" : "44px 24px",
              textAlign: "center",
              background: dragOver ? C.paperWarm : "transparent",
              cursor: "pointer",
              marginBottom: 24,
              transition: "background 150ms ease, border-color 150ms ease, padding 150ms ease",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept={PDF_MIME}
              onChange={(e) => processFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
            {!pdfFile && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <path d="M17 8l-5-5-5 5" />
                    <path d="M12 3v12" />
                  </svg>
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: C.ink, marginBottom: 4 }}>
                  Upload a document
                </div>
                <div style={{ fontSize: 14, color: C.muted }}>PDF, up to 20MB</div>
              </div>
            )}
            {pdfFile && (
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
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); clearFile(); }}
                  style={{
                    background: "transparent", border: "none",
                    color: C.forest, fontWeight: 600, fontSize: 13,
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  Replace
                </button>
              </div>
            )}
          </label>

          {pdfError && (
            <div
              style={{
                marginBottom: 16,
                padding: "10px 14px", fontSize: 13,
                background: C.errorBg, color: C.errorText,
                border: `1px solid ${C.errorBorder}`, borderRadius: 6,
              }}
            >
              {pdfError}
            </div>
          )}

          <Field label="Template name" required>
            <input
              className="tn-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Standard Lease Agreement"
              maxLength={100}
              style={{ ...inputStyle(), width: "100%" }}
            />
          </Field>

          <div style={{ height: 16 }} />

          <Field label="Description" optional>
            <textarea
              className="tn-input"
              value={description}
              onChange={(e) => { if (e.target.value.length <= 500) setDescription(e.target.value); }}
              placeholder="What this template is for. Helps you remember when looking at the list later."
              rows={2}
              style={{ ...inputStyle(), width: "100%", resize: "vertical", fontFamily: FONT_SANS, lineHeight: 1.5 }}
            />
          </Field>
        </div>
      </div>

      <div
        className="tn-actionbar"
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
        <button
          type="button"
          onClick={() => navigate("/templates")}
          style={{
            background: "transparent", border: "none", padding: "8px 0",
            color: C.muted, fontFamily: FONT_SANS, fontSize: 14, fontWeight: 500,
            cursor: "pointer",
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.forest; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="tn-cta"
          style={{
            padding: "11px 20px",
            background: C.forest, color: C.paper,
            border: "none", borderRadius: 6,
            fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600,
            letterSpacing: "0.01em", cursor: "pointer",
            transition: "background 150ms ease, transform 80ms ease",
          }}
        >
          Continue to fields →
        </button>
      </div>
    </div>
  );
}

function Field({ label, required, optional, children }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          {label}
        </span>
        {required && <span style={{ fontSize: 11, color: C.forest, fontWeight: 600 }}>*</span>}
        {optional && (
          <span style={{ fontSize: 10, fontWeight: 600, color: C.soft, letterSpacing: "0.04em", textTransform: "uppercase", padding: "2px 6px", background: C.paperWarm, borderRadius: 4 }}>
            Optional
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function inputStyle() {
  return {
    boxSizing: "border-box",
    padding: "10px 12px",
    border: `1px solid ${C.border}`,
    borderRadius: 6,
    background: "#FFFFFF",
    fontSize: 14,
    color: C.ink,
    outline: "none",
    fontFamily: FONT_SANS,
    transition: "border-color 140ms ease, box-shadow 140ms ease",
  };
}
