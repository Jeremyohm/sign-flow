const C = {
  ink:    "#0F1418",
  muted:  "#5A6168",
  border: "#E0E0DC",
};

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

// Section wrapper for the dashboard zones. Renders a header (title + optional
// count) with content below. If the children are empty, callers are expected
// to either render an inline empty message or omit the Zone entirely.
export function Zone({ title, count, children, footer }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: `1px solid ${C.border}`,
        }}
      >
        <h2
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 18,
            fontWeight: 600,
            color: C.ink,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h2>
        {typeof count === "number" && (
          <span
            style={{
              fontFamily: FONT_SANS,
              fontSize: 13,
              fontWeight: 500,
              color: C.muted,
            }}
          >
            · {count}
          </span>
        )}
      </header>
      <div>{children}</div>
      {footer && <div style={{ marginTop: 12 }}>{footer}</div>}
    </section>
  );
}
