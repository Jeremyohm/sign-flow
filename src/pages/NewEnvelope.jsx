import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { F, SC } from "../theme";
import { uid, useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Card, SectionLabel, BackBtn, Input, PageContainer } from "../components/ui";

export function NewEnvelope({ templates, onCreate }) {
  const T = useT();
  useDocTitle("New Envelope");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get("template");
  const [name, setName] = useState("");
  const [pages, setPages] = useState(3);
  const [selTmpl, setSelTmpl] = useState(preselectedId || null);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);
  const [signers, setSigners] = useState([{ name: "", email: "", role: "Signer" }]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

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

  const processFile = async (file) => {
    if (!file) return;
    if (file.type !== "application/pdf") { setPdfError("Please upload a PDF file"); return; }
    if (file.size > 20 * 1024 * 1024) { setPdfError("File must be under 20MB"); return; }
    setPdfFile(file);
    setPdfError(null);
    setPdfLoading(true);
    if (!name.trim()) setName(file.name.replace(/\.pdf$/i, ""));
    try {
      const arrayBuffer = await file.arrayBuffer();
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
      setPdfPages(pageImages);
      setPages(pageImages.length);
      setPdfLoading(false);
    } catch (err) {
      console.error(err);
      setPdfError("Failed to read PDF. The file may be encrypted or corrupted.");
      setPdfLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  const handleFileChange = async (e) => {
    processFile(e.target.files?.[0]);
  };

  const removePdf = () => {
    setPdfFile(null); setPdfPages(null); setPdfError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const create = () => {
    if (!name.trim()) return;
    const tmpl = templates.find(t => t.id === selTmpl);
    const env = {
      id: uid(), name, status: "draft", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      signers: tmpl
        ? tmpl.signerRoles.map((r, i) => ({ id: `s${i + 1}`, name: "", email: "", role: r, status: "pending", signedAt: null }))
        : signers.filter(s => s.email.trim()).map((s, i) => ({ id: `s${i + 1}`, name: s.name, email: s.email, role: s.role, status: "pending", signedAt: null })),
      routing: "sequential", pages: pdfPages ? pdfPages.length : (tmpl ? tmpl.pages : pages),
      templateId: selTmpl, templateFields: tmpl ? tmpl.fields : null,
      pdfPages: pdfPages || null,
      pdfFile: pdfFile || null,
    };
    onCreate(env);
  };

  return (
    <PageContainer maxWidth={560}>
      <BackBtn onClick={() => navigate("/")} label="Documents" />
      <h1 style={{ fontFamily: F.display, fontSize: 24, fontWeight: 600, margin: "0 0 24px" }}>New Envelope</h1>
      {/* PDF Upload */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Upload Document</SectionLabel>
        <input ref={fileRef} type="file" accept=".pdf,application/pdf" onChange={handleFileChange}
          style={{ display: "none" }} />
        {!pdfFile ? (
          <div onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragOver ? T.accent : T.border}`, borderRadius: 12, padding: "28px 20px",
            textAlign: "center", cursor: "pointer", transition: "all 0.15s",
            background: dragOver ? T.accentSoft : T.surfaceAlt,
          }}
          onMouseEnter={e => { if (!dragOver) { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentSoft; } }}
          onMouseLeave={e => { if (!dragOver) { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.surfaceAlt; } }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.accentSoft,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Ic d={I.upload} size={20} color={T.accent} s />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Upload PDF</div>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>
              Click to browse or drag & drop · Max 20MB
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
            background: T.surfaceAlt, borderRadius: 10, border: `1px solid ${T.border}` }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: T.errorSoft,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Ic d={I.file} size={18} color={T.error} s />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {pdfFile.name}
              </div>
              <div style={{ fontSize: 11, color: T.textDim }}>
                {pdfLoading ? "Rendering pages…" : pdfPages ? `${pdfPages.length} page${pdfPages.length > 1 ? "s" : ""} rendered` : "Processing…"}
              </div>
            </div>
            {pdfLoading ? (
              <div style={{ width: 18, height: 18, border: `2px solid ${T.border}`, borderTop: `2px solid ${T.accent}`,
                borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            ) : (
              <button onClick={removePdf} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                <Ic d={I.trash} size={16} color={T.textDim} s />
              </button>
            )}
          </div>
        )}
        {pdfError && (
          <div style={{ marginTop: 8, fontSize: 12, color: T.error, background: T.errorSoft,
            padding: "8px 12px", borderRadius: 8 }}>{pdfError}</div>
        )}
        {pdfPages && pdfPages.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {pdfPages.map((pg, i) => (
              <div key={i} style={{ flexShrink: 0, width: 72, borderRadius: 6, overflow: "hidden",
                border: `1px solid ${T.border}`, boxShadow: T.shadow, position: "relative" }}>
                <img src={pg} alt={`Page ${i + 1}`} style={{ width: "100%", display: "block" }} />
                <div style={{ position: "absolute", bottom: 2, right: 4, fontSize: 9, fontWeight: 700,
                  color: T.white, background: "rgba(0,0,0,0.5)", padding: "1px 4px", borderRadius: 4 }}>{i + 1}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 11, color: T.textDim }}>
          {pdfPages ? "Your PDF has been rendered and is ready for field placement." : "Or skip to use placeholder pages."}
        </div>
      </Card>
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Document Name</SectionLabel>
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Purchase Agreement — 123 Main St" />
      </Card>
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Template (Optional)</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div onClick={() => setSelTmpl(null)} style={{
            padding: "12px 14px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
            border: `1.5px solid ${selTmpl === null ? T.accent : T.border}`,
            background: selTmpl === null ? T.accentSoft : T.surfaceAlt,
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: selTmpl === null ? T.accent : T.text }}>Blank — start from scratch</div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Place fields manually on the document</div>
          </div>
          {templates.map(t => (
            <div key={t.id} onClick={() => { setSelTmpl(t.id); if (!pdfPages) setPages(t.pages); }} style={{
              padding: "12px 14px", borderRadius: 10, cursor: "pointer", transition: "all 0.15s",
              border: `1.5px solid ${selTmpl === t.id ? T.accent : T.border}`,
              background: selTmpl === t.id ? T.accentSoft : T.surfaceAlt,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: selTmpl === t.id ? T.accent : T.text }}>{t.name}</div>
                <span style={{ fontSize: 10, color: T.textDim }}>{t.fields.length} fields</span>
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{t.description}</div>
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                {t.signerRoles.map((r, i) => (
                  <span key={i} style={{ fontSize: 9, fontWeight: 600, color: SC[i % 3], background: `${SC[i % 3]}12`,
                    padding: "1px 6px", borderRadius: 10 }}>{r}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
      {/* Recipients */}
      {!selTmpl && (
        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>Recipients</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {signers.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <Input value={s.name} onChange={e => { const a = [...signers]; a[i] = { ...a[i], name: e.target.value }; setSigners(a); }}
                    placeholder="Full name" />
                  <Input value={s.email} onChange={e => { const a = [...signers]; a[i] = { ...a[i], email: e.target.value }; setSigners(a); }}
                    placeholder="Email address" type="email" />
                  <select value={s.role} onChange={e => { const a = [...signers]; a[i] = { ...a[i], role: e.target.value }; setSigners(a); }}
                    style={{ padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`, background: T.surfaceAlt,
                      fontSize: 13, fontFamily: F.body, color: T.text, cursor: "pointer" }}>
                    <option value="Signer">Signer</option>
                    <option value="Reviewer">Reviewer</option>
                    <option value="CC">CC</option>
                  </select>
                </div>
                {signers.length > 1 && (
                  <button onClick={() => setSigners(signers.filter((_, j) => j !== i))}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: 6, marginTop: 6 }}>
                    <Ic d={I.trash} size={14} color={T.textDim} s />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button onClick={() => setSigners([...signers, { name: "", email: "", role: "Signer" }])}
            style={{ marginTop: 10, background: "none", border: `1px dashed ${T.border}`, borderRadius: 8,
              padding: "8px 14px", fontSize: 12, fontWeight: 600, color: T.accent, cursor: "pointer",
              fontFamily: F.body, width: "100%", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.accentSoft; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = "transparent"; }}>
            + Add Recipient
          </button>
        </Card>
      )}
      {!selTmpl && !pdfPages && (
        <Card style={{ marginBottom: 16 }}>
          <SectionLabel>Number of Pages</SectionLabel>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setPages(n)} style={{
                flex: 1, padding: "8px 0", borderRadius: 8,
                border: pages === n ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                background: pages === n ? T.accentSoft : T.surfaceAlt,
                color: pages === n ? T.accent : T.textSec, fontSize: 13, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
              }}>{n}</button>
            ))}
          </div>
        </Card>
      )}
      <Btn onClick={create} disabled={!name.trim() || pdfLoading} size="lg" style={{ width: "100%", justifyContent: "center" }}>
        Create & Prepare <Ic d={I.arrow} size={14} color={T.white} s />
      </Btn>
    </PageContainer>
  );
}
