import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { F, SC, FTYPES } from "../theme";
import { mkPage, useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Badge, Card, SectionLabel, BackBtn, Input, PageContainer } from "../components/ui";
import { SigPad, TypedSig } from "../components/fields";
import * as db from "../lib/db";

export function Sign({ envelopes, notify, setEnvelopes }) {
  const T = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  useDocTitle("Sign Document");

  const [loading, setLoading] = useState(true);
  const [env, setEnv] = useState(null);
  const [signers, setSignersLocal] = useState([]);
  const [fields, setFieldsLocal] = useState([]);
  const [pendingSigner, setPendingSigner] = useState(null);
  const [pendingIdx, setPendingIdx] = useState(0);
  const [myFields, setMyFields] = useState([]);

  const [sName, setSName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [signed, setSigned] = useState(false);
  const [fieldValues, setFieldValues] = useState({});
  const [activeField, setActiveField] = useState(null);
  const [sigMode, setSigMode] = useState("draw");
  const [sigData, setSigData] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [pages, setPages] = useState([]);
  const [error, setError] = useState(null);

  // Access code gate state
  const [needsAccessCode, setNeedsAccessCode] = useState(false);
  const [accessVerified, setAccessVerified] = useState(false);
  const [accessCodeInput, setAccessCodeInput] = useState("");
  const [accessError, setAccessError] = useState("");
  const [accessLocked, setAccessLocked] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState(5);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // First try as sign_token via RPC
        const result = await db.getEnvelopeForSigning(id);
        if (result) {
          setEnv(result.envelope);
          setSignersLocal(result.signers || []);
          setFieldsLocal(result.fields || []);
          const ps = (result.signers || []).find(s => s.status === "pending");
          const pi = (result.signers || []).findIndex(s => s.status === "pending");
          setPendingSigner(ps || null);
          setPendingIdx(pi >= 0 ? pi : 0);
          setMyFields((result.fields || []).filter(f => f.signer_index === pi));
          if (ps) setSName(ps.name || "");

          // Check if this signer needs an access code
          if (result.signer?.has_access_code) {
            setNeedsAccessCode(true);
            if (result.signer.access_attempts >= 5) {
              setAccessLocked(true);
            }
            setAttemptsRemaining(Math.max(0, 5 - (result.signer.access_attempts || 0)));
          }
        } else {
          // Fallback: try as envelope ID from local state (for logged-in owner)
          const local = envelopes.find(e => e.id === id);
          if (local) {
            setEnv(local);
            setSignersLocal(local.signers || []);
            setFieldsLocal(local.fields || []);
            const ps = (local.signers || []).find(s => s.status === "pending");
            const pi = (local.signers || []).findIndex(s => s.status === "pending");
            setPendingSigner(ps || null);
            setPendingIdx(pi >= 0 ? pi : 0);
            setMyFields((local.fields || []).filter(f => (f.signer_index ?? f.signer) === pi));
            if (ps) setSName(ps.name || "");
          } else {
            setError("Document not found or link is invalid.");
          }
        }
      } catch (err) {
        console.error("Sign load error:", err);
        setError("Failed to load document.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Load pdf.js
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

  // Build pages
  useEffect(() => {
    if (!env) return;
    if (env.pdfPages && env.pdfPages.length > 0) {
      setPages(env.pdfPages);
    } else if (env.pdf_url) {
      // Load PDF from Supabase Storage and render with pdf.js
      (async () => {
        try {
          const url = await db.getSignedPdfUrl(env.pdf_url);
          const waitForPdfJs = () => new Promise((resolve) => {
            if (window.pdfjsLib) return resolve();
            const check = setInterval(() => { if (window.pdfjsLib) { clearInterval(check); resolve(); } }, 100);
          });
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
          setPages(pageImages);
        } catch (err) {
          console.error("Failed to load PDF from storage:", err);
          const p = [];
          for (let i = 0; i < Math.max(env.pages, 1); i++) p.push(mkPage(i + 1, Math.max(env.pages, 1), env.name));
          setPages(p);
        }
      })();
    } else {
      const p = [];
      for (let i = 0; i < Math.max(env.pages, 1); i++) p.push(mkPage(i + 1, Math.max(env.pages, 1), env.name));
      setPages(p);
    }
  }, [env]);

  const handleVerifyCode = async () => {
    if (!accessCodeInput.trim() || verifying) return;
    setVerifying(true);
    setAccessError("");
    try {
      const result = await db.verifyAccessCode(id, accessCodeInput.trim());
      if (result.verified) {
        setAccessVerified(true);
      } else if (result.locked) {
        setAccessLocked(true);
      } else {
        setAttemptsRemaining(result.attempts_remaining);
        setAccessError(`Incorrect code. ${result.attempts_remaining} attempt${result.attempts_remaining !== 1 ? "s" : ""} remaining.`);
        setAccessCodeInput("");
      }
    } catch (err) {
      console.error("Access code verify error:", err);
      setAccessError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const allFieldsFilled = myFields.length === 0 || myFields.every(f => fieldValues[f.id]);

  const handleFieldClick = (field) => {
    if (fieldValues[field.id]) return;
    if (field.type === "date") {
      setFieldValues(prev => ({ ...prev, [field.id]: new Date().toLocaleDateString("en-US") }));
      return;
    }
    setActiveField(field);
    setSigData(null);
    setTextInput("");
  };

  const confirmField = () => {
    if (!activeField) return;
    if (activeField.type === "text" && textInput.trim()) {
      setFieldValues(prev => ({ ...prev, [activeField.id]: textInput.trim() }));
    } else if ((activeField.type === "signature" || activeField.type === "initials") && sigData) {
      setFieldValues(prev => ({ ...prev, [activeField.id]: sigData }));
    }
    setActiveField(null);
    setSigData(null);
    setTextInput("");
  };

  const handleSign = async () => {
    if (!agreed || !sName.trim() || !allFieldsFilled) return;

    try {
      // Update field values in DB
      for (const [fieldId, value] of Object.entries(fieldValues)) {
        await db.updateField(fieldId, { value });
      }

      // Update signer status
      if (pendingSigner) {
        await db.updateSigner(pendingSigner.id, {
          status: "signed",
          signed_at: new Date().toISOString(),
          name: sName,
        });
      }

      // Check if all signers are done and update envelope
      const updatedSigners = signers.map(s =>
        s.id === pendingSigner?.id
          ? { ...s, status: "signed", signed_at: new Date().toISOString(), name: sName }
          : s
      );
      const allSigned = updatedSigners.every(s => s.status === "signed");
      if (allSigned) {
        await db.updateEnvelope(env.id, { status: "completed" });
      } else {
        await db.updateEnvelope(env.id, { status: "in_progress" });
        const next = updatedSigners.find(s => s.status === "waiting");
        if (next) {
          await db.updateSigner(next.id, { status: "pending" });
        }
      }

      // Update local state if available
      if (setEnvelopes) {
        setEnvelopes(prev => prev.map(e => {
          if (e.id !== env.id) return e;
          const u = { ...e, updatedAt: new Date().toISOString() };
          u.signers = updatedSigners;
          u.status = allSigned ? "completed" : "in_progress";
          return u;
        }));
      }

      setSigned(true);
      if (notify) notify("Document signed successfully!");
    } catch (err) {
      console.error("Sign error:", err);
      if (notify) notify("Failed to sign — please try again", "warning");
    }
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`,
          borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 13, color: T.textDim }}>Loading document...</p>
      </div>
    </div>
  );

  if (error) return (
    <PageContainer maxWidth={480}>
      <Card style={{ textAlign: "center", padding: 40 }}>
        <Ic d={I.shield} size={32} color={T.error} s />
        <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, margin: "12px 0 8px" }}>Invalid Link</h2>
        <p style={{ fontSize: 13, color: T.textSec }}>{error}</p>
      </Card>
    </PageContainer>
  );

  if (!env) return null;

  // Access code gate — show before document if signer has a code set
  if (needsAccessCode && !accessVerified) return (
    <PageContainer maxWidth={420}>
      <Card style={{ textAlign: "center", padding: 40 }}>
        <div style={{ width: 52, height: 52, borderRadius: "50%", background: accessLocked ? `${T.error}12` : `${T.accent}12`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", border: `2px solid ${accessLocked ? T.error : T.accent}22` }}>
          <Ic d={I.shield} size={24} color={accessLocked ? T.error : T.accent} s />
        </div>
        <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, margin: "0 0 8px" }}>
          {accessLocked ? "Account Locked" : "Access Code Required"}
        </h2>
        {accessLocked ? (
          <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
            Too many incorrect attempts. Please contact the sender to unlock access to this document.
          </p>
        ) : (
          <>
            <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginBottom: 20 }}>
              The sender requires an access code to view this document. Contact them directly if you don't have it.
            </p>
            <div style={{ display: "flex", gap: 8, maxWidth: 280, margin: "0 auto" }}>
              <Input value={accessCodeInput} onChange={e => setAccessCodeInput(e.target.value)}
                placeholder="Enter access code" autoFocus
                onKeyDown={e => { if (e.key === "Enter") handleVerifyCode(); }}
                style={{ flex: 1, textAlign: "center", letterSpacing: 2, fontWeight: 600 }} />
              <Btn onClick={handleVerifyCode} disabled={!accessCodeInput.trim() || verifying}>
                {verifying ? "..." : "Verify"}
              </Btn>
            </div>
            {accessError && (
              <p style={{ fontSize: 12, color: T.error, marginTop: 10, fontWeight: 500 }}>{accessError}</p>
            )}
            <p style={{ fontSize: 11, color: T.textDim, marginTop: 14 }}>
              {attemptsRemaining} of 5 attempts remaining
            </p>
          </>
        )}
      </Card>
    </PageContainer>
  );

  if (signed) return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px", textAlign: "center", animation: "fadeIn 0.3s ease" }}>
      <div style={{ width: 64, height: 64, borderRadius: "50%", background: T.successSoft,
        display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 20px", border: `2px solid ${T.success}22` }}>
        <Ic d={I.check} size={28} color={T.success} s />
      </div>
      <h2 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 600, margin: "0 0 8px" }}>Signed!</h2>
      <p style={{ fontSize: 14, color: T.textSec, marginBottom: 28 }}>Your signature has been recorded and the document has been updated.</p>
    </div>
  );

  if (!pendingSigner) return (
    <PageContainer maxWidth={480}>
      <Card style={{ textAlign: "center", padding: 40 }}>
        <Ic d={I.check} size={32} color={T.success} s />
        <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, margin: "12px 0 8px" }}>
          {env.status === "completed" ? "All Signatures Complete" : "No Pending Signer"}
        </h2>
        <p style={{ fontSize: 13, color: T.textSec }}>
          {env.status === "completed" ? "This document has been fully signed by all parties." : "There is no signer currently pending for this document."}
        </p>
      </Card>
    </PageContainer>
  );

  const filledCount = myFields.filter(f => fieldValues[f.id]).length;

  return (
    <PageContainer maxWidth={680}>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, margin: 0 }}>Sign Document</h2>
            <p style={{ fontSize: 12, color: T.textSec, margin: "3px 0 0" }}>{env.name}</p>
          </div>
          <Badge color={T.warm} bg={T.warmSoft}>Action Required</Badge>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 14px",
          background: T.surfaceAlt, borderRadius: 8, border: `1px solid ${T.border}` }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${SC[pendingIdx % 3]}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: SC[pendingIdx % 3] }}>{pendingIdx + 1}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Signing as: {pendingSigner.name || pendingSigner.role || "Signer"}</div>
            <div style={{ fontSize: 11, color: T.textDim }}>
              {myFields.length} field{myFields.length !== 1 ? "s" : ""} to complete · {filledCount} done
            </div>
          </div>
          {allFieldsFilled && myFields.length > 0 && (
            <Badge color={T.success} bg={T.successSoft}>All Fields Done</Badge>
          )}
        </div>
      </Card>

      {/* Document pages with fields */}
      <Card style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
          <SectionLabel style={{ margin: 0 }}>Document Preview — click fields to fill them</SectionLabel>
        </div>
        <div style={{ padding: 16, background: T.bgWarm }}>
          {pages.map((page, pi) => {
            const pageMyFields = myFields.filter(f => f.page === pi);
            if (pageMyFields.length === 0 && pages.length > 2) {
              return (
                <div key={pi} style={{ marginBottom: 12, borderRadius: 8, overflow: "hidden",
                  border: `1px solid ${T.border}`, position: "relative", height: 60, background: T.surface }}>
                  <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center",
                    justifyContent: "center", fontSize: 11, color: T.textDim }}>
                    Page {pi + 1} — no fields to fill
                  </div>
                </div>
              );
            }
            return (
              <div key={pi} style={{ marginBottom: 12, borderRadius: 8, overflow: "hidden",
                border: `1px solid ${T.border}`, boxShadow: T.shadow, position: "relative" }}>
                <img src={page} alt={`Page ${pi + 1}`} style={{ width: "100%", display: "block" }} />
                {pageMyFields.map(field => {
                  const ftype = FTYPES.find(ft => ft.id === field.type);
                  const filled = fieldValues[field.id] || field.value;
                  const isImage = filled && filled.startsWith("data:");
                  const fx = field.x; const fy = field.y; const fw = field.w; const fh = field.h;
                  return (
                    <div key={field.id} onClick={() => !field.value && handleFieldClick(field)}
                      style={{
                        position: "absolute",
                        left: `${(fx / 612) * 100}%`, top: `${(fy / 792) * 100}%`,
                        width: `${(fw / 612) * 100}%`, height: `${(fh / 792) * 100}%`,
                        border: `2px ${filled ? "solid" : "dashed"} ${filled ? T.success : SC[pendingIdx % 3]}`,
                        borderRadius: 4,
                        background: filled ? `${T.success}15` : `${SC[pendingIdx % 3]}18`,
                        cursor: filled ? "default" : "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s", overflow: "hidden",
                      }}
                      onMouseEnter={e => { if (!filled) e.currentTarget.style.background = `${SC[pendingIdx % 3]}30`; }}
                      onMouseLeave={e => { if (!filled) e.currentTarget.style.background = `${SC[pendingIdx % 3]}18`; }}
                    >
                      {filled ? (
                        isImage ? (
                          <img src={filled} alt="signature" style={{ maxWidth: "95%", maxHeight: "95%", objectFit: "contain" }} />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 600, color: T.success, padding: "0 4px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", textAlign: "center" }}>
                            {filled}
                          </span>
                        )
                      ) : (
                        <span style={{ fontSize: 10, fontWeight: 600, color: SC[pendingIdx % 3],
                          display: "flex", alignItems: "center", gap: 3 }}>
                          <Ic d={ftype.icon} size={11} color={SC[pendingIdx % 3]} s />
                          {ftype.label}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Field input modal */}
      {activeField && (
        <div onClick={() => setActiveField(null)} style={{
          position: "fixed", inset: 0, background: "rgba(44,42,37,0.5)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          backdropFilter: "blur(4px)", animation: "fadeIn 0.15s ease",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.surface, borderRadius: 16, padding: 24, width: "100%", maxWidth: 420,
            boxShadow: T.shadowLg,
          }}>
            {(activeField.type === "signature" || activeField.type === "initials") && (
              <>
                <SectionLabel>{activeField.type === "signature" ? "Draw Your Signature" : "Draw Your Initials"}</SectionLabel>
                <div style={{ display: "flex", background: T.bgWarm, borderRadius: 8, padding: 3, marginBottom: 14 }}>
                  {[{ id: "draw", label: "Draw" }, { id: "type", label: "Type" }].map(m => (
                    <button key={m.id} onClick={() => { setSigMode(m.id); setSigData(null); }} style={{
                      flex: 1, padding: "7px 0", borderRadius: 6, border: "none",
                      background: sigMode === m.id ? T.surface : "transparent", boxShadow: sigMode === m.id ? T.shadow : "none",
                      color: sigMode === m.id ? T.text : T.textDim, fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
                    }}>{m.label}</button>
                  ))}
                </div>
                {sigMode === "draw" ? (
                  <SigPad onCapture={setSigData} onClear={() => setSigData(null)} />
                ) : (
                  <TypedSig name={sName} setName={setSName} onCapture={setSigData} />
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setActiveField(null)}>Cancel</Btn>
                  <Btn onClick={confirmField} disabled={!sigData}>Apply {activeField.type === "signature" ? "Signature" : "Initials"}</Btn>
                </div>
              </>
            )}
            {activeField.type === "text" && (
              <>
                <SectionLabel>Enter Text</SectionLabel>
                <Input value={textInput} onChange={e => setTextInput(e.target.value)} placeholder="Type here..."
                  autoFocus style={{ marginBottom: 16 }}
                  onKeyDown={e => { if (e.key === "Enter" && textInput.trim()) confirmField(); }} />
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <Btn variant="secondary" onClick={() => setActiveField(null)}>Cancel</Btn>
                  <Btn onClick={confirmField} disabled={!textInput.trim()}>Apply Text</Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Name input */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Your Full Name</SectionLabel>
        <Input value={sName} onChange={e => setSName(e.target.value)} placeholder="Enter your full legal name" />
      </Card>

      {/* ESIGN consent */}
      <Card style={{ marginBottom: 16, padding: 16, display: "flex", gap: 12, alignItems: "flex-start" }}>
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
          style={{ marginTop: 2, accentColor: T.accent, width: 16, height: 16, flexShrink: 0 }} />
        <label style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5, cursor: "pointer" }} onClick={() => setAgreed(!agreed)}>
          I agree to use electronic signatures under the ESIGN Act (15 U.S.C. § 7001) and UETA. My signature is legally binding.
        </label>
      </Card>

      {/* Complete button */}
      <Btn onClick={handleSign} disabled={!agreed || !sName.trim() || !allFieldsFilled} size="lg"
        style={{ width: "100%", justifyContent: "center" }}>
        <Ic d={I.pen} size={15} color={T.white} s /> Complete Signing
      </Btn>
      {!allFieldsFilled && (
        <p style={{ textAlign: "center", fontSize: 11, color: T.textDim, marginTop: 8 }}>
          Fill all {myFields.length - filledCount} remaining field{myFields.length - filledCount !== 1 ? "s" : ""} above before signing
        </p>
      )}
    </PageContainer>
  );
}
