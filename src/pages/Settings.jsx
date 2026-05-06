import { useDocTitle } from "../utils";

const C = {
  ink:    "#0F1418",
  muted:  "#5A6168",
  forest: "#1E5128",
  paperWarm: "#F2F2EE",
  border: "#E0E0DC",
};

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

export function Settings() {
  useDocTitle("Settings");
  return (
    <div style={{ fontFamily: FONT_SANS }}>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 32,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: C.ink,
          margin: "0 0 8px",
        }}
      >
        Settings
      </h1>
      <p style={{ fontSize: 15, color: C.muted, margin: "0 0 32px", maxWidth: 480, lineHeight: 1.5 }}>
        Account and workspace settings will live here. This page is a placeholder
        until the next pass.
      </p>
      <div
        style={{
          padding: "20px 24px",
          background: C.paperWarm,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          maxWidth: 600,
          fontSize: 13,
          color: C.muted,
          lineHeight: 1.5,
        }}
      >
        Coming soon: profile, billing, team, API keys, webhooks, and notification
        preferences.
      </div>
    </div>
  );
}
