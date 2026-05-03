import { useState } from "react";
import { F, EMAIL_STATUS } from "../theme";
import { fd, ft, useDocTitle, useT } from "../utils";
import { Ic, I, Badge, Card, SectionLabel, PageContainer, PageHeader, FilterBar, StatCard, Modal, EmptyState } from "../components/ui";

export function Notifications({ emails }) {
  const T = useT();
  useDocTitle("Email Log");
  const [filter, setFilter] = useState("all");
  const [preview, setPreview] = useState(null);
  const filtered = filter === "all" ? emails : emails.filter(e => e.status === filter);
  const ec = {};
  for (const e of emails) ec[e.status] = (ec[e.status] || 0) + 1;
  const stats = [
    { label: "Total Sent", value: emails.length, color: T.text },
    { label: "Delivered", value: (ec.delivered || 0) + (ec.opened || 0), color: T.accent },
    { label: "Opened", value: ec.opened || 0, color: T.success },
    { label: "Pending", value: ec.sending || 0, color: T.warm },
  ];
  return (
    <PageContainer>
      <PageHeader title="Email Log" subtitle="Track notification delivery and engagement" />
      <div className="sf-stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>
      <div style={{ marginBottom: 16 }}>
        <FilterBar options={["all", "sending", "delivered", "opened", "bounced"]} active={filter} onChange={setFilter} />
      </div>
      {/* Email list */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 && <EmptyState message="No emails match this filter" />}
        {filtered.map((em, idx) => {
          const sc = EMAIL_STATUS[em.status] || EMAIL_STATUS.sending;
          return (
            <div key={em.id} onClick={() => setPreview(em)}
              style={{
                display: "flex", alignItems: "center", gap: 14, padding: "14px 18px",
                borderBottom: idx < filtered.length - 1 ? `1px solid ${T.borderLight}` : "none",
                cursor: "pointer", transition: "background 0.12s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: sc.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ic d={em.type === "reminder" ? I.bell : em.type === "completed" ? I.check : I.mail} size={16} color={sc.color} s />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {em.subject}
                </div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                  To: {em.toName} &lt;{em.to}&gt; · {fd(em.sentAt)} at {ft(em.sentAt)}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>
                <Ic d={I.arrow} size={14} color={T.textDim} s />
              </div>
            </div>
          );
        })}
      </Card>
      {/* Email Preview Modal */}
      {preview && (
        <Modal onClose={() => setPreview(null)}>
            {/* Modal header */}
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Email Preview</div>
                <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                  {EMAIL_STATUS[preview.status]?.label} · Sent {fd(preview.sentAt)}
                </div>
              </div>
              <button onClick={() => setPreview(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: T.textDim, padding: 4 }}>×</button>
            </div>
            {/* Email metadata */}
            <div style={{ padding: "12px 20px", background: T.surfaceAlt, borderBottom: `1px solid ${T.border}`, fontSize: 12 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ color: T.textDim, width: 50 }}>From:</span>
                <span style={{ color: T.text, fontWeight: 500 }}>Legacy Sign &lt;noreply@sign.yourserver.com&gt;</span>
              </div>
              <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                <span style={{ color: T.textDim, width: 50 }}>To:</span>
                <span style={{ color: T.text, fontWeight: 500 }}>{preview.toName} &lt;{preview.to}&gt;</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{ color: T.textDim, width: 50 }}>Subject:</span>
                <span style={{ color: T.text, fontWeight: 600 }}>{preview.subject}</span>
              </div>
            </div>
            {/* Email body preview */}
            <div style={{ padding: 24 }}>
              <div style={{ background: T.bg, borderRadius: 12, border: `1px solid ${T.border}`, padding: 24 }}>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: T.accentSoft,
                    display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
                    <Ic d={I.shield} size={20} color={T.accent} s />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Legacy Sign</div>
                </div>
                <div style={{ fontSize: 14, color: T.text, lineHeight: 1.6, marginBottom: 16 }}>
                  Hi {preview.toName},
                </div>
                <div style={{ fontSize: 14, color: T.textSec, lineHeight: 1.6, marginBottom: 20 }}>
                  {preview.type === "reminder"
                    ? "This is a friendly reminder that you have a document waiting for your signature. Please review and sign at your earliest convenience."
                    : "You have been requested to sign the following document. Please review and complete your signature."}
                </div>
                <div style={{ background: T.surface, borderRadius: 10, border: `1px solid ${T.border}`, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{preview.envelopeName}</div>
                  <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>Sent by: Legacy Sign on behalf of the sender</div>
                </div>
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <div style={{
                    display: "inline-block", background: T.accent, color: T.white,
                    padding: "12px 32px", borderRadius: 8, fontSize: 14, fontWeight: 700,
                    fontFamily: F.body, cursor: "default",
                  }}>
                    Review & Sign Document
                  </div>
                </div>
                <div style={{ fontSize: 11, color: T.textDim, textAlign: "center", wordBreak: "break-all", marginBottom: 16 }}>
                  Or copy this link: {preview.signingUrl}
                </div>
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: T.textDim, lineHeight: 1.5 }}>
                    This document is protected by electronic signature laws (ESIGN Act & UETA).<br />If you did not expect this email, please disregard it.
                  </div>
                </div>
              </div>
            </div>
            {/* Delivery timeline */}
            <div style={{ padding: "0 24px 20px" }}>
              <SectionLabel>Delivery Timeline</SectionLabel>
              <div style={{ display: "flex", gap: 16 }}>
                {[
                  { label: "Sent", time: preview.sentAt, done: true },
                  { label: "Delivered", time: preview.deliveredAt, done: !!preview.deliveredAt },
                  { label: "Opened", time: preview.openedAt, done: !!preview.openedAt },
                ].map((step, i, arr) => (
                  <div key={i} style={{ flex: 1, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%",
                        background: step.done ? T.success : T.surfaceHover,
                        border: `2px solid ${step.done ? T.success : T.border}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {step.done && <Ic d={I.check} size={10} color={T.white} s />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: step.done ? T.text : T.textDim }}>{step.label}</span>
                    </div>
                    <div style={{ fontSize: 10, color: T.textDim, marginLeft: 24 }}>
                      {step.time ? `${fd(step.time)} ${ft(step.time)}` : "—"}
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ position: "absolute", top: 8, left: 28, right: -8, height: 2,
                        background: step.done && arr[i + 1].done ? T.success : T.border, zIndex: 0 }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
        </Modal>
      )}
    </PageContainer>
  );
}
