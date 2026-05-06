import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router-dom";
import { F, SC, STATUS, EMAIL_STATUS } from "../theme";
import { fd, ft, signingUrl, useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Badge, Card, SectionLabel, BackBtn, PageContainer } from "../components/ui";
import * as db from "../lib/db";

export function Detail({ envelopes, setEnvelopes, notify, sendEmail, emails }) {
  const T = useT();
  const { id } = useParams();
  const navigate = useNavigate();
  const env = envelopes.find(e => e.id === id);
  const [showDelete, setShowDelete] = useState(false);
  useDocTitle(env ? env.name : "Document");
  if (!env) return <Navigate to="/" replace />;

  const handleDelete = async () => {
    try {
      await db.deleteEnvelope(id);
      setEnvelopes(p => p.filter(e => e.id !== id));
      notify("Envelope deleted");
      navigate("/");
    } catch (err) {
      console.error("Delete error:", err);
      notify("Failed to delete", "warning");
    }
  };

  const st = STATUS[env.status];
  const envEmails = emails.filter(e => e.envelopeId === env.id);
  return (
    <PageContainer maxWidth={720}>
      <BackBtn onClick={() => navigate("/")} label="Documents" />
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ fontFamily: F.display, fontSize: 20, fontWeight: 600, margin: 0 }}>{env.name}</h2>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <Badge color={st.color} bg={st.bg}>{st.label}</Badge>
              <span style={{ fontSize: 11, color: T.textDim }}>{env.routing} · {env.pages} page{env.pages > 1 ? "s" : ""}</span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {env.status === "draft" && <Btn onClick={() => navigate(`/prepare/${env.id}`)} variant="secondary">Prepare</Btn>}
            {(env.status === "sent" || env.status === "in_progress") && <Btn onClick={() => navigate(`/sign/${env.id}`)}>Sign Now</Btn>}
            {env.status === "completed" && <>
              <Btn variant="secondary" onClick={async () => {
                try {
                  const url = await db.fetchSignedDocumentUrl(env.id);
                  window.location.href = url;
                } catch (err) {
                  if (err.status === 425) notify("Document still being generated", "warning");
                  else notify("Download failed", "warning");
                }
              }}>Download Signed</Btn>
              <Btn variant="secondary" onClick={async () => {
                try {
                  const url = await db.fetchCertificateUrl(env.id);
                  window.location.href = url;
                } catch (err) {
                  if (err.status === 425) notify("Certificate still being generated", "warning");
                  else notify("Download failed", "warning");
                }
              }}>Download Certificate</Btn>
            </>}
            <Btn variant="danger" size="sm" onClick={() => setShowDelete(true)}><Ic d={I.trash} size={13} color={T.error} s /></Btn>
          </div>
        </div>
      </Card>
      {/* Signers */}
      <Card style={{ marginBottom: 16 }}>
        <SectionLabel>Signing Order</SectionLabel>
        {env.signers.length === 0 && <p style={{ color: T.textDim, fontSize: 13, margin: 0 }}>No signers added yet. Go to Prepare to add signers and fields.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {env.signers.map((s, i) => {
            const isSigned = s.status === "signed"; const isPending = s.status === "pending";
            return (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 10,
                border: `1px solid ${T.border}`, background: isSigned ? T.successSoft : T.surface }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%",
                  background: isSigned ? T.success : isPending ? `${SC[i % 3]}18` : T.surfaceAlt,
                  color: isSigned ? T.white : isPending ? SC[i % 3] : T.textDim,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, border: `2px solid ${isSigned ? T.success : SC[i % 3]}22` }}>
                  {isSigned ? <Ic d={I.check} size={14} color={T.white} s /> : i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name || `Signer ${i + 1}`}</div>
                  <div style={{ fontSize: 12, color: T.textSec }}>{s.email || "No email"} · {s.role}</div>
                  {isSigned && s.signedAt && <div style={{ fontSize: 11, color: T.success, marginTop: 2 }}>Signed {fd(s.signedAt)} at {ft(s.signedAt)}</div>}
                  {(s.access_code_hash || s.has_access_code) && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}>
                      <Ic d={I.shield} size={10} color={T.accent} s />
                      <span style={{ fontSize: 10, color: T.textDim }}>Access code set</span>
                      {s.access_attempts >= 5 && (
                        <Btn variant="ghost" size="sm" style={{ padding: "1px 6px", fontSize: 9 }} onClick={async () => {
                          try {
                            await db.updateSigner(s.id, { access_attempts: 0 });
                            setEnvelopes(prev => prev.map(e => {
                              if (e.id !== env.id) return e;
                              return { ...e, signers: e.signers.map(sg => sg.id === s.id ? { ...sg, access_attempts: 0 } : sg) };
                            }));
                            notify("Lockout reset for " + (s.name || "signer"));
                          } catch (err) { notify("Failed to reset lockout", "warning"); }
                        }}>Reset lockout</Btn>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {isSigned && <Badge color={T.success} bg={T.successSoft}>Signed</Badge>}
                  {isPending && <>
                    <Btn variant="ghost" size="sm" onClick={() => {
                      if (s.email) { sendEmail(env, s, "reminder"); notify(`Reminder sent to ${s.name}`); }
                      else { notify("No email address for this signer", "warning"); }
                    }}><Ic d={I.mail} size={13} color={T.textSec} s /> Remind</Btn>
                    <Btn variant="ghost" size="sm" onClick={() => {
                      navigator.clipboard?.writeText(signingUrl(s.sign_token || env.id)); notify("Signing link copied");
                    }}><Ic d={I.link} size={13} color={T.textSec} s /> Link</Btn>
                  </>}
                </div>
                {s.status === "waiting" && <Badge color={T.textDim}>Waiting</Badge>}
              </div>
            );
          })}
        </div>
      </Card>
      {/* Email Activity */}
      {envEmails.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <SectionLabel><Ic d={I.mail} size={13} color={T.textDim} s /> Email Activity</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {envEmails.map(em => {
              const sc = EMAIL_STATUS[em.status] || EMAIL_STATUS.sending;
              return (
                <div key={em.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                  borderRadius: 8, border: `1px solid ${T.borderLight}`, background: T.surfaceAlt }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: sc.bg,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ic d={em.type === "reminder" ? I.bell : I.mail} size={14} color={sc.color} s />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {em.subject}
                    </div>
                    <div style={{ fontSize: 11, color: T.textDim }}>To: {em.toName} ({em.to}) · {fd(em.sentAt)}</div>
                  </div>
                  <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {/* Audit */}
      <Card>
        <SectionLabel><Ic d={I.shield} size={13} color={T.textDim} s /> Audit Trail</SectionLabel>
        {[{ action: "Envelope created", time: env.createdAt },
          ...(env.status !== "draft" ? [{ action: "Sent for signing", time: env.createdAt }] : []),
          ...envEmails.map(em => ({ action: `${em.type === "reminder" ? "Reminder" : "Signing request"} sent to ${em.toName}`, time: em.sentAt })),
          ...env.signers.filter(s => s.status === "signed").map(s => ({ action: `${s.name} signed`, time: s.signedAt })),
        ].sort((a, b) => new Date(a.time) - new Date(b.time)).map((e, i, arr) => (
          <div key={i} style={{ display: "flex", gap: 12, paddingBottom: i < arr.length - 1 ? 14 : 0, marginBottom: i < arr.length - 1 ? 14 : 0, borderBottom: i < arr.length - 1 ? `1px solid ${T.borderLight}` : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
              {i < arr.length - 1 && <div style={{ width: 1, flex: 1, background: T.border, marginTop: 4 }} />}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{e.action}</div>
              <div style={{ fontSize: 11, color: T.textDim }}>{fd(e.time)} at {ft(e.time)}</div>
            </div>
          </div>
        ))}
      </Card>
      {/* Delete confirmation */}
      {showDelete && (
        <div onClick={() => setShowDelete(false)} style={{
          position: "fixed", inset: 0, background: "rgba(44,42,37,0.4)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.surface, borderRadius: 16, padding: 24, width: "100%", maxWidth: 360,
            boxShadow: T.shadowLg, textAlign: "center",
          }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Delete "{env.name}"?</div>
            <p style={{ fontSize: 13, color: T.textSec, marginBottom: 20, lineHeight: 1.5 }}>
              This envelope and all its data will be permanently removed.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn variant="secondary" onClick={() => setShowDelete(false)}>Cancel</Btn>
              <Btn variant="danger" onClick={handleDelete}><Ic d={I.trash} size={13} color={T.error} s /> Delete</Btn>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
