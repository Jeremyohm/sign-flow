import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { F, SC, FTYPES } from "../theme";
import { uid, useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Badge, SectionLabel, BackBtn, Input } from "../components/ui";
import { DField } from "../components/fields";
import * as db from "../lib/db";

export function TemplateEditor({ templates, setTemplates, notify, user }) {
  const T = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const tmpl = templates.find(t => t.id === id);
  useDocTitle(tmpl ? `Edit — ${tmpl.name}` : "Template Editor");

  const [pages, setPages] = useState([]);
  const [fields, setFields] = useState([]);
  const [roles, setRoles] = useState([]);
  const [curPage, setCurPage] = useState(0);
  const [selField, setSelField] = useState(null);
  const [actSigner, setActSigner] = useState(0);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const cRef = useRef(null);
  const canvasParent = useRef(null);
  const [scale, setScale] = useState(1);
  const fCt = useRef(0);

  useEffect(() => {
    if (!tmpl) return;
    if (tmpl.page_images && tmpl.page_images.length > 0) {
      setPages(tmpl.page_images);
    } else if (tmpl.pdf_url) {
      (async () => {
        try {
          const url = db.getPublicPdfUrl(tmpl.pdf_url);
          const waitForPdfJs = () => new Promise((resolve) => {
            if (window.pdfjsLib) return resolve();
            const check = setInterval(() => { if (window.pdfjsLib) { clearInterval(check); resolve(); } }, 100);
          });
          await waitForPdfJs();
          const resp = await fetch(url);
          const arrayBuffer = await resp.arrayBuffer();
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
          setPages(imgs);
        } catch (err) {
          console.error("Failed to load PDF:", err);
        }
      })();
    }
  }, [tmpl]);

  useEffect(() => {
    if (!tmpl) return;
    if (fields.length > 0) return;
    const tmplFields = (tmpl.fields || []).map((f, i) => ({
      id: `tf_${i}`, type: f.type, page: f.page, x: f.x, y: f.y,
      w: f.w, h: f.h, signer: f.signer_index ?? f.signer ?? 0,
      label: f.label || null, options: f.options || null, defaultValue: f.defaultValue || null, format: f.format || null,
    }));
    setFields(tmplFields);
    fCt.current = tmplFields.length;
  }, [tmpl]);

  useEffect(() => {
    if (!tmpl) return;
    setRoles(tmpl.signerRoles || tmpl.signer_roles || []);
  }, [tmpl]);

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
    const resize = () => {
      const parent = canvasParent.current;
      if (parent) setScale(Math.min(1, (parent.clientWidth - 56) / 612));
    };
    resize(); window.addEventListener("resize", resize); return () => window.removeEventListener("resize", resize);
  }, [pages]);

  if (!tmpl) return <Navigate to="/templates" replace />;

  const addField = type => {
    const ftype = FTYPES.find(f => f.id === type);
    const fid = `tf_${++fCt.current}`;
    const newField = { id: fid, type, page: curPage, x: 80 + Math.random() * 200, y: 250 + Math.random() * 200, w: ftype.w, h: ftype.h, signer: actSigner, label: null };
    if (type === "dropdown") newField.options = ["Option 1", "Option 2"];
    setFields(p => [...p, newField]);
    setSelField(fid);
    setDirty(true);
  };

  const moveField = useCallback((fid, x, y) => { setFields(p => p.map(f => f.id === fid ? { ...f, x, y } : f)); setDirty(true); }, []);
  const resizeField = useCallback((fid, w, h) => { setFields(p => p.map(f => f.id === fid ? { ...f, w, h } : f)); setDirty(true); }, []);
  const deleteField = useCallback(fid => { setFields(p => p.filter(f => f.id !== fid)); setSelField(null); setDirty(true); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const exportFields = fields.map(({ id: _id, ...rest }) => {
        const f = {
          type: rest.type, page: rest.page, x: Math.round(rest.x), y: Math.round(rest.y),
          w: Math.round(rest.w), h: Math.round(rest.h), signer_index: rest.signer,
          label: rest.label || `${rest.type}_p${rest.page}_${Math.round(rest.x)}`,
        };
        if (rest.type === "dropdown" && rest.options) f.options = rest.options;
        if (rest.defaultValue) f.defaultValue = rest.defaultValue;
        if (rest.format && rest.format !== "text") f.format = rest.format;
        return f;
      });
      const updated = await db.updateTemplate(tmpl.id, {
        fields: exportFields,
        signer_roles: roles,
      });
      setTemplates(prev => prev.map(t => t.id === tmpl.id ? {
        ...t, ...updated, signerRoles: updated.signer_roles, fields: updated.fields,
      } : t));
      setDirty(false);
      notify("Template saved");
    } catch (err) {
      console.error("Save template error:", err);
      notify("Failed to save template", "warning");
    } finally {
      setSaving(false);
    }
  };

  const addRole = () => {
    const n = roles.length + 1;
    setRoles(p => [...p, `Signer ${n}`]);
    setDirty(true);
  };

  const removeRole = (idx) => {
    setRoles(p => p.filter((_, i) => i !== idx));
    setFields(p => p.filter(f => f.signer !== idx).map(f => ({
      ...f, signer: f.signer > idx ? f.signer - 1 : f.signer,
    })));
    if (actSigner >= idx && actSigner > 0) setActSigner(actSigner - 1);
    setDirty(true);
  };

  const renameRole = (idx, name) => {
    setRoles(p => p.map((r, i) => i === idx ? name : r));
    setDirty(true);
  };

  const pageFields = fields.filter(f => f.page === curPage);
  const selFieldData = selField ? fields.find(f => f.id === selField) : null;

  return (
    <div style={{ display: "flex", height: "calc(100vh - 56px)", animation: "fadeIn 0.3s ease" }}>
      {/* Sidebar */}
      <div style={{ width: 270, minWidth: 270, background: T.surface, borderRight: `1px solid ${T.border}`,
        padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <BackBtn onClick={() => navigate("/templates")} label="Templates" />
        <div>
          <h3 style={{ fontFamily: F.display, fontSize: 16, fontWeight: 600, margin: "0 0 3px" }}>Template Editor</h3>
          <p style={{ fontSize: 12, color: T.textSec, margin: 0, lineHeight: 1.4 }}>{tmpl.name}</p>
          <p style={{ fontSize: 11, color: T.textDim, margin: "4px 0 0", lineHeight: 1.4 }}>
            {fields.length} fields · {pages.length} pages · {roles.length} roles
          </p>
        </div>

        {/* Signer Roles */}
        <div>
          <SectionLabel>Signer Roles</SectionLabel>
          {roles.map((role, i) => {
            const c = SC[i % SC.length];
            const fc = fields.filter(f => f.signer === i).length;
            return (
              <div key={i} style={{ marginBottom: 4 }}>
                <button onClick={() => setActSigner(i)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  border: actSigner === i ? `1.5px solid ${c}` : `1px solid transparent`,
                  background: actSigner === i ? `${c}10` : "transparent",
                  color: T.text, fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer", borderRadius: 8,
                }}>
                  <div style={{ width: 22, height: 22, borderRadius: "50%", background: c,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 700, color: "#fff", flexShrink: 0 }}>{i + 1}</div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    {editingRole === i ? (
                      <input autoFocus value={role} onChange={e => renameRole(i, e.target.value)}
                        onBlur={() => setEditingRole(null)} onKeyDown={e => e.key === "Enter" && setEditingRole(null)}
                        onClick={e => e.stopPropagation()}
                        style={{ width: "100%", border: "none", background: "transparent", fontFamily: F.body,
                          outline: "none", padding: 0, color: T.text, fontSize: 12, fontWeight: 600 }} />
                    ) : (
                      <span onDoubleClick={e => { e.stopPropagation(); setEditingRole(i); }}>{role}</span>
                    )}
                    <div style={{ fontSize: 10, color: T.textDim, fontWeight: 400 }}>{fc} field{fc !== 1 ? "s" : ""}</div>
                  </div>
                  {roles.length > 1 && (
                    <button onClick={e => { e.stopPropagation(); removeRole(i); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2, opacity: 0.5 }}>
                      <Ic d={I.trash} size={11} color={T.textDim} s />
                    </button>
                  )}
                </button>
              </div>
            );
          })}
          {roles.length < 10 && (
            <button onClick={addRole} style={{ width: "100%", padding: "6px 10px", borderRadius: 8,
              border: `1px dashed ${T.border}`, background: "transparent", color: T.textDim,
              fontSize: 11, fontFamily: F.body, cursor: "pointer" }}>+ Add role</button>
          )}
        </div>

        {/* Field Types */}
        <div>
          <SectionLabel>Add Field</SectionLabel>
          <div style={{ fontSize: 10, color: T.textDim, marginBottom: 6 }}>
            Click to add for <span style={{ color: SC[actSigner % SC.length], fontWeight: 700 }}>{roles[actSigner] || "Signer"}</span>
          </div>
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

        {/* Selected Field Info */}
        {selFieldData && (
          <div style={{ background: T.surfaceAlt, borderRadius: 10, padding: 12 }}>
            <SectionLabel>Selected Field</SectionLabel>
            <div style={{ fontSize: 11, color: T.textSec, marginBottom: 6 }}>
              {FTYPES.find(f => f.id === selFieldData.type)?.label} — {roles[selFieldData.signer] || `Signer ${selFieldData.signer + 1}`}
            </div>
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 8 }}>
              x:{Math.round(selFieldData.x)} y:{Math.round(selFieldData.y)} w:{Math.round(selFieldData.w)} h:{Math.round(selFieldData.h)}
            </div>
            <Input size="sm" value={selFieldData.label || ""} placeholder="Field label (optional)"
              onChange={e => { const v = e.target.value; setFields(p => p.map(f => f.id === selField ? { ...f, label: v } : f)); setDirty(true); }}
              style={{ marginBottom: 6 }} />
            {(selFieldData.type === "text" || selFieldData.type === "dropdown") && (
              <Input size="sm" value={selFieldData.defaultValue || ""} placeholder="Default value (pre-filled, editable)"
                onChange={e => { const v = e.target.value; setFields(p => p.map(f => f.id === selField ? { ...f, defaultValue: v } : f)); setDirty(true); }}
                style={{ marginBottom: 6 }} />
            )}
            {selFieldData.type === "date" && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Default date:</div>
                <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                  {[{ id: "", label: "None" }, { id: "today", label: "Today's Date" }, { id: "pick", label: "Pick a Date" }].map(opt => (
                    <button key={opt.id} onClick={() => {
                      const mode = opt.id === "pick" ? "pick" : opt.id;
                      setFields(p => p.map(f => f.id === selField ? { ...f, defaultValue: mode || null } : f)); setDirty(true);
                    }}
                      style={{ flex: 1, padding: "4px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
                        border: (selFieldData.defaultValue === opt.id || (!selFieldData.defaultValue && opt.id === "") || (selFieldData.defaultValue && selFieldData.defaultValue !== "today" && selFieldData.defaultValue !== "" && opt.id === "pick"))
                          ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                        background: (selFieldData.defaultValue === opt.id || (!selFieldData.defaultValue && opt.id === "") || (selFieldData.defaultValue && selFieldData.defaultValue !== "today" && selFieldData.defaultValue !== "" && opt.id === "pick"))
                          ? `${T.accent}15` : "transparent",
                        color: (selFieldData.defaultValue === opt.id || (!selFieldData.defaultValue && opt.id === "") || (selFieldData.defaultValue && selFieldData.defaultValue !== "today" && selFieldData.defaultValue !== "" && opt.id === "pick"))
                          ? T.accent : T.textDim }}>{opt.label}</button>
                  ))}
                </div>
                {selFieldData.defaultValue && selFieldData.defaultValue !== "today" && selFieldData.defaultValue !== "" && (
                  <input type="date" value={selFieldData.defaultValue === "pick" ? "" : selFieldData.defaultValue}
                    onChange={e => { setFields(p => p.map(f => f.id === selField ? { ...f, defaultValue: e.target.value } : f)); setDirty(true); }}
                    style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`,
                      background: T.surfaceAlt, color: T.text, fontSize: 11, fontFamily: F.body, boxSizing: "border-box" }} />
                )}
              </div>
            )}
            {selFieldData.type === "text" && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Format:</div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ id: "text", label: "Text" }, { id: "dollar", label: "$ Dollar" }, { id: "percent", label: "% Percent" }].map(fmt => (
                    <button key={fmt.id} onClick={() => { setFields(p => p.map(f => f.id === selField ? { ...f, format: fmt.id } : f)); setDirty(true); }}
                      style={{ flex: 1, padding: "4px 6px", borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
                        border: (selFieldData.format || "text") === fmt.id ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                        background: (selFieldData.format || "text") === fmt.id ? `${T.accent}15` : "transparent",
                        color: (selFieldData.format || "text") === fmt.id ? T.accent : T.textDim }}>{fmt.label}</button>
                  ))}
                </div>
              </div>
            )}
            {selFieldData.type === "date_signed" && (
              <div style={{ fontSize: 10, color: T.warning, marginBottom: 6, fontStyle: "italic" }}>
                Auto-fills with the date the signer signs. Read-only.
              </div>
            )}
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Assign to:</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {roles.map((r, i) => (
                <button key={i} onClick={() => { setFields(p => p.map(f => f.id === selField ? { ...f, signer: i } : f)); setDirty(true); }}
                  style={{ padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, fontFamily: F.body, cursor: "pointer",
                    border: selFieldData.signer === i ? `1.5px solid ${SC[i % SC.length]}` : `1px solid ${T.border}`,
                    background: selFieldData.signer === i ? `${SC[i % SC.length]}15` : "transparent",
                    color: selFieldData.signer === i ? SC[i % SC.length] : T.textDim }}>{r}</button>
              ))}
            </div>
            {selFieldData.type === "dropdown" && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 10, color: T.textDim, marginBottom: 4 }}>Dropdown Options:</div>
                {(selFieldData.options || []).map((opt, oi) => (
                  <div key={oi} style={{ display: "flex", gap: 4, marginBottom: 4, alignItems: "center" }}>
                    <Input size="sm" value={opt} style={{ flex: 1 }}
                      onChange={e => { const v = e.target.value; setFields(p => p.map(f => {
                        if (f.id !== selField) return f;
                        const opts = [...(f.options || [])]; opts[oi] = v; return { ...f, options: opts };
                      })); setDirty(true); }} />
                    <button onClick={() => { setFields(p => p.map(f => {
                      if (f.id !== selField) return f;
                      return { ...f, options: (f.options || []).filter((_, j) => j !== oi) };
                    })); setDirty(true); }}
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <Ic d={I.trash} size={10} color={T.textDim} s />
                    </button>
                  </div>
                ))}
                <button onClick={() => { setFields(p => p.map(f => {
                  if (f.id !== selField) return f;
                  return { ...f, options: [...(f.options || []), `Option ${(f.options || []).length + 1}`] };
                })); setDirty(true); }}
                  style={{ width: "100%", padding: "4px 8px", borderRadius: 6, border: `1px dashed ${T.border}`,
                    background: "transparent", color: T.textDim, fontSize: 10, fontFamily: F.body, cursor: "pointer" }}>
                  + Add option
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pages */}
        <div>
          <SectionLabel>Pages</SectionLabel>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {pages.map((_, i) => {
              const fc = fields.filter(f => f.page === i).length;
              return (
                <button key={i} onClick={() => { setCurPage(i); setSelField(null); }} style={{
                  minWidth: 36, padding: "6px 0", borderRadius: 8,
                  border: curPage === i ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                  background: curPage === i ? T.accentSoft : T.surfaceAlt,
                  color: curPage === i ? T.accent : T.textSec, fontSize: 11, fontWeight: 600,
                  fontFamily: F.body, cursor: "pointer", position: "relative",
                }}>
                  {i + 1}
                  {fc > 0 && (
                    <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%",
                      background: T.accent, color: T.white, fontSize: 8, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center" }}>{fc}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div style={{ borderTop: `1px solid ${T.borderLight}`, paddingTop: 16, marginTop: "auto" }}>
          <Btn onClick={handleSave} disabled={!dirty || saving} size="lg"
            style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "Saving..." : dirty ? "Save Template" : "Saved"}
          </Btn>
          {dirty && (
            <div style={{ textAlign: "center", marginTop: 6, fontSize: 10, color: T.warm }}>
              Unsaved changes
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={canvasParent} style={{ flex: 1, overflow: "auto", padding: 28, display: "flex",
        justifyContent: "center", alignItems: "flex-start", background: T.bg }}
        onClick={() => setSelField(null)}>
        <div ref={cRef} style={{ position: "relative", width: 612 * scale, height: 792 * scale,
          boxShadow: T.shadowLg, borderRadius: 6, overflow: "hidden" }}>
          {pages[curPage] && <img src={pages[curPage]} alt="" style={{ width: "100%", height: "100%", display: "block" }} />}
          {pageFields.map(f => (
            <DField key={f.id} field={f} scale={scale} onMove={moveField} onResize={resizeField}
              onDelete={deleteField} selected={selField === f.id} onSelect={setSelField}
              signerColor={SC[f.signer % SC.length]} />
          ))}
          {pageFields.length === 0 && (
            <div style={{ position: "absolute", bottom: 8, left: "50%", transform: "translateX(-50%)", pointerEvents: "none" }}>
              <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 8, padding: "6px 14px",
                color: "#fff", fontSize: 11, fontFamily: F.body, whiteSpace: "nowrap" }}>
                Click a field type in the sidebar to add it to this page
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
