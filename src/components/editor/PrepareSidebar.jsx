import { RecipientCard } from "./RecipientCard";
import { FieldTypeCard } from "./FieldTypeCard";

const C = {
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  ink: "#0F1418",
  muted: "#5A6168",
  soft: "#8A8A82",
  forest: "#1E5128",
  forestDark: "#163E1F",
  border: "#E0E0DC",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

const FIELD_TYPES = ["signature", "initials", "date", "text"];

export function PrepareSidebar({
  envelopeName,
  pageCount,
  recipients,                // [{ id, name, email, color, fieldCount }]
  activeRecipientId,
  setActiveRecipientId,
  onBack,
  onSaveTemplate,
  onSend,
  sendDisabled,
  sendDisabledReason,
}) {
  const activeRecipient = recipients.find(r => r.id === activeRecipientId) || recipients[0];
  const activeColor = activeRecipient?.color || C.forest;

  return (
    <aside
      style={{
        width: 280,
        flexShrink: 0,
        background: C.paper,
        borderRight: `1px solid ${C.border}`,
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Back link */}
      <div style={{ padding: "16px 24px 12px", borderBottom: `1px solid ${C.border}` }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "transparent",
            border: "none",
            padding: 0,
            cursor: "pointer",
            color: C.muted,
            fontFamily: FONT_SANS,
            fontSize: 12,
            fontWeight: 500,
            transition: "color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = C.forest; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" /><path d="M12 19l-7-7 7-7" />
          </svg>
          Back to documents
        </button>
      </div>

      {/* Scrollable middle */}
      <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
        {/* Envelope info */}
        <div style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 18,
              fontWeight: 600,
              color: C.ink,
              margin: "0 0 4px",
              letterSpacing: "-0.01em",
              wordBreak: "break-word",
            }}
          >
            {envelopeName || "Untitled envelope"}
          </h1>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            {pageCount} {pageCount === 1 ? "page" : "page"} document
          </p>
        </div>

        {/* Recipients */}
        <div style={{ marginBottom: 32 }}>
          <SectionLabel>Recipients</SectionLabel>
          {recipients.length === 0 ? (
            <p style={{ fontSize: 12, color: C.soft, fontStyle: "italic" }}>
              No signer recipients on this envelope yet.
            </p>
          ) : (
            <>
              {recipients.map(r => (
                <RecipientCard
                  key={r.id}
                  recipient={r}
                  color={r.color}
                  fieldCount={r.fieldCount}
                  isActive={r.id === activeRecipientId}
                  onClick={() => setActiveRecipientId(r.id)}
                />
              ))}
              <p style={{ fontSize: 11, color: C.soft, lineHeight: 1.5, marginTop: 8 }}>
                Click a recipient to assign their fields, then drag from the field types below.
              </p>
            </>
          )}
        </div>

        {/* Field types */}
        <div>
          <SectionLabel>Drag to place</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {FIELD_TYPES.map(t => (
              <FieldTypeCard key={t} type={t} accentColor={activeColor} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div
        style={{
          padding: "16px 24px",
          background: C.paperWarm,
          borderTop: `1px solid ${C.border}`,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onSaveTemplate}
          style={{
            padding: "10px 14px",
            background: "transparent",
            color: C.ink,
            border: `1px solid ${C.border}`,
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
            transition: "border-color 150ms ease",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.ink; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; }}
        >
          Save as Template
        </button>
        <button
          type="button"
          onClick={onSend}
          disabled={sendDisabled}
          title={sendDisabled ? sendDisabledReason : "Send envelope to recipients"}
          style={{
            padding: "11px 14px",
            background: sendDisabled ? "#9CA3A0" : C.forest,
            color: C.paper,
            border: "none",
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.01em",
            cursor: sendDisabled ? "not-allowed" : "pointer",
            opacity: sendDisabled ? 0.6 : 1,
            transition: "background 150ms ease, transform 80ms ease",
          }}
          onMouseEnter={(e) => { if (!sendDisabled) e.currentTarget.style.background = C.forestDark; }}
          onMouseLeave={(e) => { if (!sendDisabled) e.currentTarget.style.background = C.forest; }}
        >
          Send for Signing
        </button>
      </div>
    </aside>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontFamily: FONT_SANS,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: C.muted,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}
