import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams } from "react-router-dom";
import { F, FTYPES } from "../theme";
import { useDocTitle, useT } from "../utils";
import { LogoMark } from "../components/ui";
import { SigPad } from "../components/fields";
import * as db from "../lib/db";

const SIG_FONT = "'Allura', cursive";

// ── Brand tokens (paper, bottle green, ink) ──
function useTokens() {
  const T = useT();
  return {
    T,
    paper: T.brand?.cream ?? "#FAFAF7",
    paperDark: T.brand?.creamWarm ?? "#F2F2EE",
    forest: T.brand?.forest ?? "#1F4D2E",
    forestDeep: T.brand?.forestDeep ?? "#163A22",
    ink: T.ink?.primary ?? "#1A1A1A",
    muted: T.ink?.muted ?? "#5A6168",
    border: T.form?.border ?? "#E0E0DC",
    danger: T.status?.errorText ?? "#A32D2D",
    dangerBg: T.status?.errorBg ?? "#FCEBEB",
  };
}

// ── Render a typed name to PNG using a chosen font ──
function renderTextToPng(text, { font = SIG_FONT, fontPx = 64, width = 480, height = 140 } = {}) {
  if (!text || !text.trim()) return null;
  const c = document.createElement("canvas");
  c.width = width;
  c.height = height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#0F1418";
  ctx.font = `${fontPx}px ${font}`;
  ctx.textBaseline = "middle";
  let actualPx = fontPx;
  while (ctx.measureText(text).width > width - 24 && actualPx > 18) {
    actualPx -= 2;
    ctx.font = `${actualPx}px ${font}`;
  }
  ctx.fillText(text, 16, height / 2);
  return c.toDataURL("image/png");
}

// ── Loading screen ──
function LoadingScreen() {
  const k = useTokens();
  return (
    <div style={{ minHeight: "100vh", background: k.paper, display: "flex",
      alignItems: "center", justifyContent: "center", fontFamily: F.sans }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 36, height: 36, border: `3px solid ${k.border}`,
          borderTop: `3px solid ${k.forest}`, borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 14px" }} />
        <p style={{ fontSize: 13, color: k.muted, margin: 0 }}>Loading document…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Generic state screen (errors, voided, expired, already-signed, not-your-turn) ──
function StateScreen({ title, body, action }) {
  const k = useTokens();
  return (
    <div style={{ minHeight: "100vh", background: k.paper, display: "flex",
      alignItems: "center", justifyContent: "center", padding: 24, fontFamily: F.sans }}>
      <div style={{ maxWidth: 480, width: "100%", textAlign: "center" }}>
        <div style={{ marginBottom: 28 }}>
          <LogoMark size={36} color={k.forest} />
        </div>
        <h1 style={{ fontFamily: F.serif, fontSize: 28, fontWeight: 600, color: k.ink,
          margin: "0 0 12px", lineHeight: 1.2 }}>{title}</h1>
        <p style={{ fontSize: 15, color: k.muted, lineHeight: 1.5, margin: "0 0 24px" }}>{body}</p>
        {action}
      </div>
    </div>
  );
}

// ── Brand top bar ──
function TopBar({ rightSlot }) {
  const k = useTokens();
  return (
    <div style={{ position: "sticky", top: 0, zIndex: 50, height: 64,
      background: k.paperDark, borderBottom: `1px solid ${k.border}`,
      display: "flex", alignItems: "center", padding: "0 20px", gap: 12 }}>
      <LogoMark size={26} color={k.forest} />
      <span style={{ fontFamily: F.serif, fontSize: 18, fontWeight: 600, color: k.forest,
        letterSpacing: -0.2 }}>Sign Flow</span>
      <div style={{ flex: 1 }} />
      {rightSlot}
    </div>
  );
}

// ── Primary button ──
function PrimaryBtn({ children, disabled, onClick, type = "button", style }) {
  const k = useTokens();
  const [hover, setHover] = useState(false);
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: disabled ? "#CFD3CC" : (hover ? k.forestDeep : k.forest),
        color: "#fff", border: "none", padding: "12px 24px", borderRadius: 10,
        fontFamily: F.sans, fontSize: 14, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
        transform: !disabled && hover ? "translateY(-1px)" : "none", transition: "all 150ms ease",
        boxShadow: !disabled && hover ? "0 4px 12px rgba(31,77,46,0.18)" : "0 1px 2px rgba(0,0,0,0.04)",
        ...style,
      }}>{children}</button>
  );
}

function SecondaryBtn({ children, onClick, style }) {
  const k = useTokens();
  const [hover, setHover] = useState(false);
  return (
    <button type="button" onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "transparent", color: k.forest, border: `1px solid ${k.border}`,
        padding: "11px 20px", borderRadius: 10, fontFamily: F.sans, fontSize: 14,
        fontWeight: 500, cursor: "pointer", transition: "all 150ms ease",
        backgroundColor: hover ? k.paperDark : "transparent",
        ...style,
      }}>{children}</button>
  );
}

// ── Access code gate ──
function AccessCodeGate({ token, onVerified, initialAttempts, initialLocked }) {
  const k = useTokens();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(initialLocked);
  const [remaining, setRemaining] = useState(Math.max(0, 5 - (initialAttempts || 0)));
  const [verifying, setVerifying] = useState(false);

  const submit = async () => {
    if (!code.trim() || verifying) return;
    setVerifying(true);
    setError("");
    try {
      const r = await db.verifyAccessCode(token, code.trim());
      if (r.verified) onVerified();
      else if (r.locked) setLocked(true);
      else {
        setRemaining(r.attempts_remaining);
        setError(`Incorrect code. ${r.attempts_remaining} attempt${r.attempts_remaining !== 1 ? "s" : ""} remaining.`);
        setCode("");
      }
    } catch {
      setError("Verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (locked) {
    return <StateScreen title="Access locked" body="Too many incorrect attempts. Contact the sender to unlock this document." />;
  }

  return (
    <div style={{ minHeight: "100vh", background: k.paper, fontFamily: F.sans }}>
      <TopBar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "60px 24px" }}>
        <div style={{ maxWidth: 440, width: "100%", background: "#fff", border: `1px solid ${k.border}`,
          borderRadius: 14, padding: 32, textAlign: "center" }}>
          <h2 style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: k.ink, margin: "0 0 10px" }}>
            Access code required
          </h2>
          <p style={{ fontSize: 14, color: k.muted, lineHeight: 1.5, margin: "0 0 24px" }}>
            The sender requires a code before you can view this document.
          </p>
          <input type="text" value={code} onChange={e => setCode(e.target.value)} autoFocus
            placeholder="Enter access code"
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 16px", textAlign: "center",
              letterSpacing: 3, fontSize: 16, fontWeight: 600, fontFamily: F.sans,
              border: `1px solid ${k.border}`, borderRadius: 10, marginBottom: 14, background: "#fff", color: k.ink }} />
          <PrimaryBtn onClick={submit} disabled={!code.trim() || verifying} style={{ width: "100%" }}>
            {verifying ? "Verifying…" : "Continue"}
          </PrimaryBtn>
          {error && <p style={{ color: k.danger, fontSize: 13, marginTop: 14, fontWeight: 500 }}>{error}</p>}
          <p style={{ fontSize: 12, color: k.muted, marginTop: 16 }}>{remaining} of 5 attempts remaining</p>
        </div>
      </div>
    </div>
  );
}

// ── Welcome / Phase 1 ──
function SignWelcome({ env, owner, signer, firstPagePreview, onContinue, onDecline, token, notify }) {
  const k = useTokens();
  const [agreed, setAgreed] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorded, setRecorded] = useState(false);

  const toggleAgree = async () => {
    if (agreed) { setAgreed(false); return; }
    if (recorded) { setAgreed(true); return; }
    setRecording(true);
    try {
      const r = await db.recordConsent(token, "us-v1-2025");
      if (r?.error) {
        notify?.(`Consent failed: ${r.error}`, "warning");
        return;
      }
      setRecorded(true);
      setAgreed(true);
    } catch {
      notify?.("Failed to record consent", "warning");
    } finally {
      setRecording(false);
    }
  };

  const fromName = owner?.name || owner?.email || "Someone";
  const fromEmail = owner?.email || "";

  return (
    <div style={{ minHeight: "100vh", background: k.paper, fontFamily: F.sans, color: k.ink }}>
      <TopBar />
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <p style={{ fontSize: 14, color: k.muted, margin: "0 0 6px" }}>
          {fromName} has sent you a document to sign
        </p>
        <h1 style={{ fontFamily: F.serif, fontSize: 32, fontWeight: 600, lineHeight: 1.15,
          color: k.ink, margin: "0 0 8px" }}>{env.name || "Untitled document"}</h1>
        <p style={{ fontSize: 13, color: k.muted, margin: "0 0 28px" }}>
          From {fromEmail || fromName}
          {env.created_at ? ` · Sent ${timeAgo(env.created_at)}` : ""}
        </p>

        {firstPagePreview && (
          <div style={{ marginBottom: 28, borderRadius: 12, overflow: "hidden",
            border: `1px solid ${k.border}`, background: "#fff" }}>
            <img src={firstPagePreview} alt="First page"
              style={{ width: "100%", display: "block", maxHeight: 480, objectFit: "contain" }} />
          </div>
        )}

        <ConsentBox agreed={agreed} recording={recording} onToggle={toggleAgree} />

        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <PrimaryBtn onClick={onContinue} disabled={!agreed}>Continue to sign</PrimaryBtn>
          <SecondaryBtn onClick={onDecline}>Decline</SecondaryBtn>
        </div>
      </main>
    </div>
  );
}

function ConsentBox({ agreed, recording, onToggle }) {
  const k = useTokens();
  return (
    <div style={{ background: k.paperDark, border: `1px solid ${k.border}`,
      borderRadius: 12, padding: 20 }}>
      <p style={{ fontSize: 13, color: k.ink, lineHeight: 1.6, margin: "0 0 14px" }}>
        By clicking <strong>"I agree to use electronic signatures"</strong>, you consent to use electronic signatures and
        electronic records for this transaction under the federal ESIGN Act (15 U.S.C. § 7001) and
        the Uniform Electronic Transactions Act (UETA). Your signature will be legally binding.
      </p>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: recording ? "wait" : "pointer",
        fontSize: 14, color: k.ink, lineHeight: 1.4 }}>
        <input type="checkbox" checked={agreed} disabled={recording} onChange={onToggle}
          style={{ marginTop: 2, accentColor: k.forest, width: 16, height: 16, flexShrink: 0 }} />
        <span>I agree to use electronic signatures.</span>
      </label>
    </div>
  );
}

// ── Signing / Phase 2 ──
function SignDocument({ env, signer, signerIdx, myFields, pages, pageSizes, setPageSizes,
  fieldValues, onFieldClick, onFinish, onDecline, fieldRefs }) {
  const k = useTokens();
  const total = myFields.length;
  const filled = myFields.filter(f => fieldValues[f.id]).length;
  const allDone = total === 0 || filled === total;
  const nextField = myFields.find(f => !fieldValues[f.id]);

  return (
    <div style={{ minHeight: "100vh", background: k.paper, fontFamily: F.sans, color: k.ink,
      paddingBottom: 96 }}>
      <TopBar rightSlot={
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13 }}>
          <span style={{ color: k.muted }}>Signing as <strong style={{ color: k.ink }}>{signer.name || signer.email}</strong></span>
        </div>
      } />

      <SignProgressBar filled={filled} total={total} nextField={nextField} />

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {pages.map((src, pi) => {
          const pageMy = myFields.filter(f => f.page === pi);
          const ps = pageSizes[pi] || { w: 918, h: 1188 };
          return (
            <div key={pi} style={{ marginBottom: 18, borderRadius: 10, overflow: "hidden",
              border: `1px solid ${k.border}`, background: "#fff", position: "relative",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
              <img src={src} alt={`Page ${pi + 1}`} style={{ width: "100%", display: "block" }}
                onLoad={e => {
                  const img = e.currentTarget;
                  if (img.naturalWidth && img.naturalHeight) {
                    setPageSizes(prev => prev[pi]?.w === img.naturalWidth ? prev : ({
                      ...prev, [pi]: { w: img.naturalWidth, h: img.naturalHeight },
                    }));
                  }
                }} />
              {pageMy.map(field => (
                <SignField key={field.id} field={field}
                  value={fieldValues[field.id]} pageSize={ps}
                  isNext={nextField?.id === field.id}
                  onClick={() => onFieldClick(field)}
                  registerRef={el => { fieldRefs.current[field.id] = el; }} />
              ))}
            </div>
          );
        })}
      </main>

      <BottomBar onFinish={onFinish} canFinish={allDone} filled={filled} total={total} onDecline={onDecline} />
    </div>
  );
}

function SignProgressBar({ filled, total, nextField }) {
  const k = useTokens();
  if (total === 0) return null;
  const pct = Math.round((filled / total) * 100);
  return (
    <div style={{ position: "sticky", top: 64, zIndex: 40, background: k.paperDark,
      borderBottom: `1px solid ${k.border}`, padding: "10px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 13, color: k.ink, fontWeight: 500, flexShrink: 0 }}>
          Field {Math.min(filled + 1, total)} of {total}
        </span>
        <div style={{ flex: 1, height: 6, background: k.border, borderRadius: 4, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: k.forest,
            transition: "width 250ms ease" }} />
        </div>
        <span style={{ fontSize: 12, color: k.muted, flexShrink: 0 }}>
          {nextField ? `Next: ${labelFor(nextField.type)}` : "All done"}
        </span>
      </div>
    </div>
  );
}

function BottomBar({ onFinish, canFinish, filled, total, onDecline }) {
  const k = useTokens();
  return (
    <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50,
      background: k.paperDark, borderTop: `1px solid ${k.border}`, padding: "14px 20px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button onClick={onDecline} style={{ background: "none", border: "none", color: k.muted,
          fontSize: 13, fontFamily: F.sans, cursor: "pointer", textDecoration: "underline" }}>
          Decline to sign
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: k.muted }}>
          {filled} of {total} field{total !== 1 ? "s" : ""} filled
        </span>
        <PrimaryBtn onClick={onFinish} disabled={!canFinish}>Finish &amp; Submit</PrimaryBtn>
      </div>
    </div>
  );
}

// ── Single field rendering ──
function SignField({ field, value, pageSize, isNext, onClick, registerRef }) {
  const k = useTokens();
  const isImage = value && typeof value === "string" && value.startsWith("data:");
  const filled = !!value;
  const ftype = FTYPES.find(ft => ft.id === field.type) || { label: field.type };

  return (
    <div ref={registerRef} onClick={!filled ? onClick : undefined}
      style={{
        position: "absolute",
        left: `${(field.x / pageSize.w) * 100}%`,
        top: `${(field.y / pageSize.h) * 100}%`,
        width: `${(field.w / pageSize.w) * 100}%`,
        height: `${(field.h / pageSize.h) * 100}%`,
        minHeight: 44,
        border: `2px ${filled ? "solid" : "dashed"} ${filled ? k.forest : (isNext ? k.forest : "#B8B6AB")}`,
        borderRadius: 4,
        background: filled ? "rgba(31,77,46,0.06)" : (isNext ? "rgba(31,77,46,0.10)" : "rgba(255,255,255,0.6)"),
        cursor: filled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden", transition: "background 150ms ease",
        animation: isNext && !filled ? "fieldPulse 1.4s ease-in-out infinite" : "none",
      }}>
      {filled ? (
        isImage ? (
          <img src={value} alt="" style={{ maxWidth: "95%", maxHeight: "95%", objectFit: "contain" }} />
        ) : (
          <span style={{ fontSize: 12, fontWeight: 500, color: k.ink, padding: "0 4px",
            overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", textAlign: "center", width: "100%" }}>
            {value}
          </span>
        )
      ) : (
        <span style={{ fontSize: 11, fontWeight: 600, color: k.forest, textTransform: "uppercase",
          letterSpacing: 0.5 }}>
          {ftype.label}
        </span>
      )}
    </div>
  );
}

// ── Signature / Initials modal (type + draw fallback) ──
function SigOrInitialsModal({ kind, defaultName, onApply, onCancel }) {
  const k = useTokens();
  const isInitials = kind === "initials";
  const [mode, setMode] = useState("type");
  const [text, setText] = useState(isInitials ? initialsFor(defaultName) : (defaultName || ""));
  const [drawn, setDrawn] = useState(null);
  const previewFont = isInitials ? `${F.sans}` : SIG_FONT;
  const previewSize = isInitials ? 38 : 56;

  const computed = useMemo(() => {
    if (mode === "draw") return drawn;
    return renderTextToPng(text, { font: previewFont, fontPx: isInitials ? 48 : 72 });
  }, [mode, drawn, text, previewFont, isInitials]);

  return (
    <ModalShell onCancel={onCancel}>
      <h3 style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: k.ink, margin: "0 0 4px" }}>
        {isInitials ? "Your initials" : "Your signature"}
      </h3>
      <p style={{ fontSize: 13, color: k.muted, margin: "0 0 18px" }}>
        Your {isInitials ? "initials are" : "typed signature is"} legally binding under the ESIGN Act.
      </p>

      <div style={{ display: "flex", background: k.paperDark, borderRadius: 8, padding: 3, marginBottom: 16 }}>
        {[{ id: "type", label: "Type" }, { id: "draw", label: "Draw" }].map(opt => (
          <button key={opt.id} type="button" onClick={() => setMode(opt.id)} style={{
            flex: 1, padding: "8px 0", borderRadius: 6, border: "none", cursor: "pointer",
            background: mode === opt.id ? "#fff" : "transparent",
            color: mode === opt.id ? k.ink : k.muted, fontFamily: F.sans, fontSize: 13, fontWeight: 600,
            boxShadow: mode === opt.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}>{opt.label}</button>
        ))}
      </div>

      {mode === "type" ? (
        <>
          <input type="text" value={text} autoFocus
            onChange={e => setText(isInitials ? e.target.value.toUpperCase().slice(0, 5) : e.target.value)}
            placeholder={isInitials ? "Your initials" : "Type your full legal name"}
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 15,
              fontFamily: F.sans, border: `1px solid ${k.border}`, borderRadius: 10,
              background: "#fff", color: k.ink }} />
          <div style={{ marginTop: 12, padding: "20px 16px", background: "#fff",
            border: `1px solid ${k.border}`, borderRadius: 10, minHeight: 90,
            display: "flex", alignItems: "center" }}>
            {text.trim()
              ? <span style={{ fontFamily: previewFont, fontSize: previewSize, color: k.ink,
                  fontWeight: isInitials ? 600 : 400, letterSpacing: isInitials ? 2 : 0 }}>{text}</span>
              : <span style={{ color: k.muted, fontSize: 13 }}>Preview appears here</span>}
          </div>
        </>
      ) : (
        <SigPad onCapture={setDrawn} onClear={() => setDrawn(null)} />
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
        <PrimaryBtn onClick={() => computed && onApply(computed)} disabled={!computed}>
          Apply {isInitials ? "initials" : "signature"}
        </PrimaryBtn>
      </div>
    </ModalShell>
  );
}

function TextFieldModal({ onApply, onCancel }) {
  const k = useTokens();
  const [text, setText] = useState("");
  return (
    <ModalShell onCancel={onCancel}>
      <h3 style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: k.ink, margin: "0 0 14px" }}>
        Enter text
      </h3>
      <input type="text" value={text} autoFocus onChange={e => setText(e.target.value)}
        placeholder="Type here…"
        onKeyDown={e => { if (e.key === "Enter" && text.trim()) onApply(text.trim()); }}
        style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", fontSize: 15,
          fontFamily: F.sans, border: `1px solid ${k.border}`, borderRadius: 10,
          background: "#fff", color: k.ink }} />
      <div style={{ display: "flex", gap: 10, marginTop: 22, justifyContent: "flex-end" }}>
        <SecondaryBtn onClick={onCancel}>Cancel</SecondaryBtn>
        <PrimaryBtn onClick={() => text.trim() && onApply(text.trim())} disabled={!text.trim()}>
          Apply
        </PrimaryBtn>
      </div>
    </ModalShell>
  );
}

function ModalShell({ children, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(15,20,24,0.55)",
      zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      backdropFilter: "blur(3px)", animation: "modalFade 150ms ease-out" }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16,
        padding: 24, width: "100%", maxWidth: 460, boxShadow: "0 24px 60px rgba(0,0,0,0.20)",
        fontFamily: F.sans, maxHeight: "90vh", overflowY: "auto" }}>
        {children}
      </div>
      <style>{`@keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes fieldPulse { 0%,100% { box-shadow: 0 0 0 0 rgba(31,77,46,0.35); } 50% { box-shadow: 0 0 0 6px rgba(31,77,46,0.0); } }`}</style>
    </div>
  );
}

// ── Confirm + success ──
function ConfirmModal({ env, filledCount, onSubmit, onCancel, submitting }) {
  const k = useTokens();
  return (
    <ModalShell onCancel={!submitting ? onCancel : undefined}>
      <h3 style={{ fontFamily: F.serif, fontSize: 22, fontWeight: 600, color: k.ink, margin: "0 0 10px" }}>
        Confirm signing
      </h3>
      <p style={{ fontSize: 14, color: k.ink, lineHeight: 1.5, margin: "0 0 8px" }}>
        You're about to submit <strong>{env.name || "this document"}</strong> with {filledCount} signed field{filledCount !== 1 ? "s" : ""}.
      </p>
      <p style={{ fontSize: 13, color: k.muted, lineHeight: 1.5, margin: "0 0 22px" }}>
        Once submitted, you can't make changes. The signed document will be emailed to you and the sender.
      </p>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <SecondaryBtn onClick={onCancel}>Go back</SecondaryBtn>
        <PrimaryBtn onClick={onSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit signed document"}
        </PrimaryBtn>
      </div>
    </ModalShell>
  );
}

function SuccessScreen({ env, owner, token }) {
  const k = useTokens();
  const [showAttribution, setShowAttribution] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShowAttribution(true), 5000);
    return () => clearTimeout(t);
  }, []);

  const downloadCopy = async () => {
    try {
      const url = await db.getSignedPdfUrlForSigning(token);
      window.open(url, "_blank");
    } catch {
      // Final PDF may not be ready immediately — silently noop; email fallback covers it.
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: k.paper, fontFamily: F.sans, color: k.ink }}>
      <TopBar />
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(31,77,46,0.10)",
          margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke={k.forest} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{ fontFamily: F.serif, fontSize: 30, fontWeight: 600, lineHeight: 1.2, margin: "0 0 10px" }}>
          Document signed.
        </h1>
        <p style={{ fontSize: 15, color: k.muted, margin: "0 0 8px" }}>
          The signed copy is being prepared. You'll receive it by email shortly.
        </p>
        {owner && (
          <p style={{ fontSize: 13, color: k.muted, margin: "0 0 24px" }}>
            From {owner.name || owner.email}{owner.email && owner.name ? ` · ${owner.email}` : ""}
          </p>
        )}
        <button onClick={downloadCopy} style={{ background: "none", border: "none",
          color: k.forest, fontSize: 14, fontWeight: 600, fontFamily: F.sans, cursor: "pointer",
          textDecoration: "underline" }}>
          Download a copy now
        </button>

        {showAttribution && (
          <div style={{ marginTop: 60, opacity: 0.7, fontSize: 12, color: k.muted,
            animation: "fadeIn 400ms ease-out" }}>
            <a href="https://sign-flow.net" target="_blank" rel="noreferrer"
              style={{ color: k.muted, textDecoration: "none" }}>
              Powered by Sign Flow
            </a>
          </div>
        )}
        <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 0.7; } }`}</style>
      </main>
    </div>
  );
}

// ── Utilities ──
function timeAgo(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return d.toLocaleDateString();
}

function labelFor(type) {
  return { signature: "Signature", initials: "Initials", date: "Date", text: "Text" }[type] || "Field";
}

function initialsFor(name) {
  if (!name) return "";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.map(p => p[0]?.toUpperCase() || "").join("").slice(0, 4);
}

// ── Top-level page ──
export function Sign({ envelopes, notify, setEnvelopes }) {
  const { id } = useParams();
  useDocTitle("Sign Document");

  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState(null);
  const [owner, setOwner] = useState(null);
  const [signers, setSigners] = useState([]);
  const [allFields, setAllFields] = useState([]);
  const [signer, setSigner] = useState(null);
  const [signerIdx, setSignerIdx] = useState(0);
  const [myFields, setMyFields] = useState([]);

  const [fieldValues, setFieldValues] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [pages, setPages] = useState([]);
  const [pageSizes, setPageSizes] = useState({});

  const [phase, setPhase] = useState("welcome"); // welcome | signing | confirming | done
  const [errorState, setErrorState] = useState(null); // { title, body }
  const [needsAccessCode, setNeedsAccessCode] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [accessAttempts, setAccessAttempts] = useState(0);
  const [accessLocked, setAccessLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fieldRefs = useRef({});

  // Load envelope + signer info
  useEffect(() => {
    async function load() {
      try {
        const result = await db.getEnvelopeForSigning(id);
        if (result) {
          setEnv(result.envelope);
          setOwner(result.owner || null);
          setSigners(result.signers || []);
          setAllFields(result.fields || []);
          const ps = (result.signers || []).find(s => s.status === "pending");
          const pi = (result.signers || []).findIndex(s => s.status === "pending");
          setSigner(ps || null);
          setSignerIdx(pi >= 0 ? pi : 0);
          setMyFields((result.fields || []).filter(f => f.signer_id === ps?.id));

          if (result.envelope?.status === "voided") {
            setErrorState({ title: "Document voided",
              body: "This document has been voided by the sender. Contact them for more information." });
            return;
          }
          if (result.envelope?.status === "expired") {
            setErrorState({ title: "Link expired",
              body: "This signing link has expired. Contact the sender to request a new one." });
            return;
          }
          if (result.signer?.status === "signed") {
            setErrorState({ title: "You've already signed",
              body: "Your signature is already on file. The signed copy will arrive by email when everyone is done." });
            return;
          }
          if (!ps) {
            setErrorState({ title: "Nothing to sign",
              body: result.envelope?.status === "completed"
                ? "All signatures are complete on this document."
                : "There is no signer currently pending." });
            return;
          }
          if (ps.id !== result.signer?.id) {
            setErrorState({ title: "Not your turn yet",
              body: "The previous signer needs to sign first. You'll be notified by email when it's your turn." });
            return;
          }

          db.recordSignerView(id);

          if (result.signer?.has_access_code) {
            setNeedsAccessCode(true);
            setAccessAttempts(result.signer.access_attempts || 0);
            if ((result.signer.access_attempts || 0) >= 5) setAccessLocked(true);
          }
        } else {
          const local = envelopes.find(e => e.id === id);
          if (local) {
            setEnv(local);
            setSigners(local.signers || []);
            setAllFields(local.fields || []);
            const ps = (local.signers || []).find(s => s.status === "pending");
            const pi = (local.signers || []).findIndex(s => s.status === "pending");
            setSigner(ps || null);
            setSignerIdx(pi >= 0 ? pi : 0);
            setMyFields((local.fields || []).filter(f => f.signer_id === ps?.id));
          } else {
            setErrorState({ title: "Invalid link",
              body: "This link is invalid or has expired." });
          }
        }
      } catch (err) {
        console.error("Sign load error:", err);
        setErrorState({ title: "Couldn't load this document",
          body: "Something went wrong loading the document. Refresh the page or contact the sender." });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Lazy-load pdf.js
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

  // Render pages
  useEffect(() => {
    if (!env) return;
    if (!env.pdf_url) return;
    let cancelled = false;
    (async () => {
      try {
        let url;
        try {
          url = await db.getSignedPdfUrlForSigning(id);
        } catch {
          url = await db.getSignedPdfUrl(env.pdf_url);
        }
        const waitForPdfJs = () => new Promise(r => {
          if (window.pdfjsLib) return r();
          const c = setInterval(() => { if (window.pdfjsLib) { clearInterval(c); r(); } }, 100);
        });
        await waitForPdfJs();
        const pdf = await window.pdfjsLib.getDocument({ url }).promise;
        const out = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelled) return;
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
          out.push(canvas.toDataURL("image/png"));
        }
        if (!cancelled) setPages(out);
      } catch (err) {
        console.error("PDF render error:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [env, id]);

  // Auto-scroll to next unfilled field
  const scrollToNext = useCallback(() => {
    requestAnimationFrame(() => {
      const next = myFields.find(f => !fieldValues[f.id]);
      if (!next) return;
      const el = fieldRefs.current[next.id];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }, [myFields, fieldValues]);

  const handleFieldClick = (field) => {
    if (fieldValues[field.id]) return;
    if (field.type === "date") {
      const today = new Date().toLocaleDateString("en-US");
      setFieldValues(prev => ({ ...prev, [field.id]: today }));
      setTimeout(scrollToNext, 100);
      return;
    }
    setActiveField(field);
  };

  const applyValue = (val) => {
    if (!activeField) return;
    setFieldValues(prev => ({ ...prev, [activeField.id]: val }));
    setActiveField(null);
    setTimeout(scrollToNext, 150);
  };

  const submitSigned = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await db.submitSignedFields(
        id,
        Object.entries(fieldValues).map(([field_id, value]) => ({ field_id, value })),
      );
      if (result?.error) {
        notify?.(result.error === "consent_required"
          ? "Please agree to use electronic signatures first."
          : `Signing failed: ${result.error}`, "warning");
        setSubmitting(false);
        return;
      }
      if (setEnvelopes && env) {
        const updatedSigners = signers.map(s => s.id === signer?.id
          ? { ...s, status: "signed", signed_at: new Date().toISOString() }
          : s);
        setEnvelopes(prev => prev.map(e => e.id === env.id
          ? { ...e, signers: updatedSigners, status: result.envelope_status, updatedAt: new Date().toISOString() }
          : e));
      }
      setPhase("done");
      notify?.("Document signed successfully");
    } catch (err) {
      console.error("Submit error:", err);
      notify?.("Failed to submit signing", "warning");
      setSubmitting(false);
    }
  };

  const declineSigning = async () => {
    if (!window.confirm("Decline to sign this document?")) return;
    try {
      const r = await db.declineEnvelope(id, "Signer declined");
      if (r?.error) {
        notify?.(`Decline failed: ${r.error}`, "warning");
        return;
      }
      setErrorState({ title: "Declined", body: "You declined to sign this document. The sender has been notified." });
    } catch {
      notify?.("Failed to decline", "warning");
    }
  };

  // ── Render branches ──
  if (loading) return <LoadingScreen />;
  if (errorState) return <StateScreen title={errorState.title} body={errorState.body} />;
  if (!env) return <StateScreen title="Invalid link" body="This link is invalid or has expired." />;

  if (needsAccessCode && !accessVerified) {
    return <AccessCodeGate token={id} initialAttempts={accessAttempts} initialLocked={accessLocked}
      onVerified={() => setAccessVerified(true)} />;
  }

  if (phase === "welcome") {
    return <SignWelcome env={env} owner={owner} signer={signer}
      firstPagePreview={pages[0]} token={id} notify={notify}
      onContinue={() => setPhase("signing")} onDecline={declineSigning} />;
  }

  if (phase === "done") return <SuccessScreen env={env} owner={owner} token={id} />;

  const filledCount = myFields.filter(f => fieldValues[f.id]).length;

  return (
    <>
      <SignDocument env={env} signer={signer} signerIdx={signerIdx}
        myFields={myFields} pages={pages} pageSizes={pageSizes} setPageSizes={setPageSizes}
        fieldValues={fieldValues} onFieldClick={handleFieldClick}
        onFinish={() => setPhase("confirming")} onDecline={declineSigning}
        fieldRefs={fieldRefs} />

      {activeField && (activeField.type === "signature" || activeField.type === "initials") && (
        <SigOrInitialsModal kind={activeField.type} defaultName={signer?.name || ""}
          onApply={applyValue} onCancel={() => setActiveField(null)} />
      )}

      {activeField && activeField.type === "text" && (
        <TextFieldModal onApply={applyValue} onCancel={() => setActiveField(null)} />
      )}

      {phase === "confirming" && (
        <ConfirmModal env={env} filledCount={filledCount} submitting={submitting}
          onSubmit={submitSigned} onCancel={() => !submitting && setPhase("signing")} />
      )}
    </>
  );
}
