import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { F, SC, FTYPES } from "../theme";
import { uid, mkPage, useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Badge, SectionLabel, BackBtn, Input } from "../components/ui";
import { DField } from "../components/fields";
import * as db from "../lib/db";

export function Prepare({ envelopes, notify, setEnvelopes, setTemplates, sendEmail, user }) {
  const T = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const env = envelopes.find(e => e.id === id);
  useDocTitle(env ? `Prepare — ${env.name}` : "Prepare");

  const [pages, setPages] = useState([]);
  const [fields, setFields] = useState([]);
  const [curPage, setCurPage] = useState(0);
  const [selField, setSelField] = useState(null);
  const [actSigner, setActSigner] = useState(0);
  const [signers, setSigners] = useState(
    env && env.signers.length > 0 ? env.signers
    : [{ id: "s1", name: "", email: "", role: "Signer", status: "pending", signedAt: null, accessCode: "" }]
  );
  const [showSaveTmpl, setShowSaveTmpl] = useState(false);
  const [tmplName, setTmplName] = useState("");
  const [tmplDesc, setTmplDesc] = useState("");
  const cRef = useRef(null);
  const [scale, setScale] = useState(1);
  const fCt = useRef(0);

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

  useEffect(() => {
    if (!env) return;
    if (env.pdfPages && env.pdfPages.length > 0) {
      setPages(env.pdfPages);
    } else if (env.pdf_url) {
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

  useEffect(() => {
    if (env?.templateFields && fields.length === 0) {
      setFields(env.templateFields.map((f, i) => ({ ...f, id: `ft_${i}`, w: f.w, h: f.h })));
    }
  }, [env?.templateFields]);

  useEffect(() => {
    const resize = () => { if (cRef.current) setScale(Math.min(1, cRef.current.clientWidth / 612)); };
    resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize);
  }, [pages]);

  if (!env) return <Navigate to="/" replace />;

  const addField = type => {
    const ftype = FTYPES.find(f => f.id === type);
    const fid = `f_${++fCt.current}`;
    setFields(p => [...p, { id: fid, type, page: curPage, x: 80 + Math.random() * 200, y: 250 + Math.random() * 200, w: ftype.w, h: ftype.h, signer: actSigner }]);
    setSelField(fid);
  };

  const moveField = useCallback((fid, x, y) => setFields(p => p.map(f => f.id === fid ? { ...f, x, y } : f)), []);
  const resizeField = useCallback((fid, w, h) => setFields(p => p.map(f => f.id === fid ? { ...f, w, h } : f)), []);
  const deleteField = useCallback(fid => { setFields(p => p.filter(f => f.id !== fid)); setSelField(null); }, []);

  const handleSend = async () => {
    try {
      // Delete old signers/fields and recreate
      await db.deleteSignersByEnvelope(env.id);
      await db.deleteFieldsByEnvelope(env.id);

      // Create signers with tokens
      const dbSigners = await db.createSigners(env.id, signers.map((s, i) => ({
        ...s, status: i === 0 ? "pending" : "waiting",
      })));

      // Create fields — map local signer index to actual signer_id
      const fieldsWithSignerId = fields.map(f => ({
        ...f,
        signer_id: dbSigners[f.signer]?.id,
      }));
      const dbFields = await db.createFields(env.id, fieldsWithSignerId);

      // Update envelope status
      await db.updateEnvelope(env.id, { status: "sent" });

      const updatedEnv = {
        ...env, status: "sent",
        signers: dbSigners,
        fields: dbFields,
        updatedAt: new Date().toISOString(),
      };
      setEnvelopes(prev => prev.map(e => e.id === env.id ? updatedEnv : e));

      const firstSigner = dbSigners.find(s => s.status === "pending");
      if (firstSigner?.email) {
        sendEmail(updatedEnv, firstSigner, "request");
      }
      notify(`"${env.name}" sent! ${firstSigner?.email ? "Signing request emailed to " + firstSigner.name + "." : ""}`);
      navigate("/");
    } catch (err) {
      console.error("Send error:", err);
      notify("Failed to send — check console", "warning");
    }
  };

  const saveTemplate = async () => {
    if (!tmplName.trim()) return;
    try {
      const tmpl = await db.createTemplate(user.id, {
        name: tmplName,
        description: tmplDesc || `Template from ${env.name}`,
        pages: pages.length,
        signerRoles: signers.map((s, i) => s.role || `Signer ${i + 1}`),
        fields: fields.map(({ id: _id, ...rest }) => rest),
      });
      setTemplates(p => [{ ...tmpl, signerRoles: tmpl.signer_roles, createdAt: tmpl.created_at, usageCount: 0 }, ...p]);
      notify("Template saved!");
      setShowSaveTmpl(false); setTmplName(""); setTmplDesc("");
    } catch (err) {
      console.error("Save template error:", err);
      notify("Failed to save template", "warning");
    }
  };

  const pageFields = fields.filter(f => f.page === curPage);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", animation: "fadeIn 0.3s ease" }}>
      {/* Sidebar */}
      <div style={{ width: 260, minWidth: 260, background: T.surface, borderRight: `1px solid ${T.border}`,
        padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
        <BackBtn onClick={() => navigate("/")} label="Documents" />
        <div>
          <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, margin: "0 0 3px" }}>Prepare</h3>
          <p style={{ fontSize: 11, color: T.textDim, margin: 0, lineHeight: 1.4 }}>{env.name}</p>
        </div>
        {/* Signers */}
        <div>
          <SectionLabel>Assign To</SectionLabel>
          {signers.map((s, i) => (
            <div key={s.id} style={{ marginBottom: 4 }}>
              <button onClick={() => setActSigner(i)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                border: actSigner === i ? `1.5px solid ${SC[i % 3]}` : `1px solid transparent`,
                background: actSigner === i ? `${SC[i % 3]}10` : "transparent",
                color: T.text, fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer", borderRadius: 8,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: SC[i % 3], flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <input value={s.name} onChange={e => { const v = e.target.value; setSigners(p => p.map((x, j) => j === i ? { ...x, name: v } : x)); }}
                    placeholder={s.role || `Signer ${i + 1}`} onClick={e => e.stopPropagation()}
                    style={{ width: "100%", border: "none", background: "transparent", fontFamily: F.body, outline: "none", padding: 0, color: T.text, fontSize: 12 }} />
                  <input value={s.email} onChange={e => { const v = e.target.value; setSigners(p => p.map((x, j) => j === i ? { ...x, email: v } : x)); }}
                    placeholder="email@example.com" onClick={e => e.stopPropagation()}
                    style={{ width: "100%", border: "none", background: "transparent", fontFamily: F.body, outline: "none", padding: 0, marginTop: 2, color: T.textSec, fontSize: 11 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                    <Ic d={I.lock} size={9} color={s.accessCode ? T.accent : T.textDim} s />
                    <input value={s.accessCode || ""} onChange={e => { const v = e.target.value; setSigners(p => p.map((x, j) => j === i ? { ...x, accessCode: v } : x)); }}
                      placeholder="Access code (optional)" onClick={e => e.stopPropagation()} maxLength={10}
                      style={{ width: "100%", border: "none", background: "transparent", fontFamily: F.body, outline: "none", padding: 0, color: T.textDim, fontSize: 10 }} />
                  </div>
                </div>
              </button>
            </div>
          ))}
          {signers.length < 3 && (
            <button onClick={() => {
              const n = signers.length + 1;
              setSigners(p => [...p, { id: `s${n}`, name: "", email: "", role: "Signer", status: "pending", signedAt: null, accessCode: "" }]);
            }} style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px dashed ${T.border}`,
              background: "transparent", color: T.textDim, fontSize: 11, fontFamily: F.body, cursor: "pointer" }}>+ Add signer</button>
          )}
        </div>
        {/* Fields */}
        <div>
          <SectionLabel>Add Field</SectionLabel>
          {FTYPES.map(ftype => (
            <button key={ftype.id} onClick={() => addField(ftype.id)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "9px 10px",
              borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceAlt,
              color: ftype.color, fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
              transition: "background 0.12s", marginBottom: 4,
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
            onMouseLeave={e => e.currentTarget.style.background = T.surfaceAlt}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: `${ftype.color}12`,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Ic d={ftype.icon} size={13} color={ftype.color} s />
              </div>
              {ftype.label}
            </button>
          ))}
        </div>
        {/* Pages */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
            <SectionLabel>Pages</SectionLabel>
            {env.pdfPages && <Badge color={T.success} bg={T.successSoft}>PDF</Badge>}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {pages.map((_, i) => {
              const fc = fields.filter(f => f.page === i).length;
              return (
                <button key={i} onClick={() => { setCurPage(i); setSelField(null); }} style={{
                  flex: 1, padding: "8px 0", borderRadius: 8,
                  border: curPage === i ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                  background: curPage === i ? T.accentSoft : T.surfaceAlt,
                  color: curPage === i ? T.accent : T.textSec, fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
                  position: "relative",
                }}>
                  {i + 1}
                  {fc > 0 && (
                    <span style={{ position: "absolute", top: -5, right: -5, width: 15, height: 15, borderRadius: "50%",
                      background: T.accent, color: T.white, fontSize: 8, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>{fc}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        {/* Save as template */}
        <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 16 }}>
          {!showSaveTmpl ? (
            <Btn variant="secondary" size="sm" onClick={() => setShowSaveTmpl(true)} disabled={fields.length === 0}
              style={{ width: "100%", justifyContent: "center" }}>
              <Ic d={I.tmpl} size={13} color={T.textSec} s /> Save as Template
            </Btn>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Input size="sm" value={tmplName} onChange={e => setTmplName(e.target.value)} placeholder="Template name" />
              <Input size="sm" value={tmplDesc} onChange={e => setTmplDesc(e.target.value)} placeholder="Description (optional)" />
              <div style={{ display: "flex", gap: 6 }}>
                <Btn variant="ghost" size="sm" onClick={() => setShowSaveTmpl(false)}>Cancel</Btn>
                <Btn size="sm" onClick={saveTemplate} disabled={!tmplName.trim()}>Save</Btn>
              </div>
            </div>
          )}
        </div>
        {/* Send */}
        <Btn onClick={handleSend} disabled={fields.length === 0} size="lg" style={{ width: "100%", justifyContent: "center" }}>
          <Ic d={I.send} size={14} color={T.white} s /> Send for Signing
        </Btn>
      </div>
      {/* Canvas */}
      <div style={{ flex: 1, overflow: "auto", padding: 28, display: "flex", justifyContent: "center", alignItems: "flex-start", background: T.bg }}
        onClick={() => setSelField(null)}>
        <div ref={cRef} style={{ position: "relative", width: 612 * scale, height: 792 * scale,
          boxShadow: T.shadowLg, borderRadius: 6, overflow: "hidden" }}>
          {pages[curPage] && <img src={pages[curPage]} alt="" style={{ width: "100%", height: "100%", display: "block" }} />}
          {pageFields.map(f => (
            <DField key={f.id} field={f} scale={scale} onMove={moveField} onResize={resizeField}
              onDelete={deleteField} selected={selField === f.id} onSelect={setSelField}
              signerColor={SC[f.signer % 3]} />
          ))}
          {pageFields.length === 0 && (
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
              <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: 12, padding: "16px 24px",
                color: T.textDim, fontSize: 12, fontFamily: F.body, border: `1px solid ${T.border}` }}>Click a field type in the sidebar to add it to this page</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
