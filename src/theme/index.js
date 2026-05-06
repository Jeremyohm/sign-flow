/* ═══════════════════════════════════════════════
   DESIGN SYSTEM — Sign Flow
═══════════════════════════════════════════════ */
export const T = {
  bg: "#F5F7F7", bgWarm: "#EBF0F0", surface: "#FFFFFF", surfaceAlt: "#F8FAFA",
  surfaceHover: "#E8F0EF", border: "#D0DBDA", borderLight: "#E0E8E7",
  borderFocus: "#00aa9f", accent: "#00aa9f", accentHover: "#008f86",
  accentSoft: "rgba(0,170,159,0.08)", accentText: "#007A72",
  warm: "#B8960B", warmSoft: "rgba(249,221,89,0.15)",
  success: "#3D7A4A", successSoft: "rgba(61,122,74,0.07)",
  warning: "#C4841D", warningSoft: "rgba(196,132,29,0.07)",
  error: "#B54334", errorSoft: "rgba(181,67,52,0.07)",
  purple: "#104674", purpleSoft: "rgba(16,70,116,0.08)",
  text: "#1E2D3D", textSec: "#5A6B7A", textDim: "#8A95A0",
  white: "#FFFFFF",
  shadow: "0 1px 3px rgba(16,70,116,0.06), 0 1px 2px rgba(16,70,116,0.04)",
  shadowMd: "0 4px 12px rgba(16,70,116,0.08), 0 1px 3px rgba(16,70,116,0.06)",
  shadowLg: "0 10px 30px rgba(16,70,116,0.10), 0 2px 8px rgba(16,70,116,0.04)",

  // Brand palette — forest green + cream, used by marketing/auth surfaces
  brand: {
    forest:     "#1F4D2E",
    forestDeep: "#163A22",
    forestSoft: "#2E6B43",
    cream:      "#FAFAF7",
    creamWarm:  "#F4F2EA",
  },

  // Trust panel — colors layered on dark forest backgrounds
  panel: {
    text:   "#FAFAF7",
    muted:  "#C8DBC2",
    soft:   "#9DB89A",
    dot:    "#7DCB94",
    border: "rgba(250, 250, 247, 0.18)",
    fill:   "rgba(250, 250, 247, 0.06)",
  },

  // Typographic ink — flat text colors for cream/white surfaces
  ink: {
    primary: "#1A1A1A",
    muted:   "#5A5A55",
    soft:    "#8A8A82",
    label:   "#3A3A36",
  },

  // Form/input system
  form: {
    border:      "#D9D7CE",
    borderHover: "#B8B6AB",
    bg:          "#FFFFFF",
    focusRing:   "rgba(31, 77, 46, 0.10)",
  },

  // Semantic states for the new auth surfaces
  status: {
    errorBg:     "#FCEBEB",
    errorBorder: "#F0B5B5",
    errorText:   "#A32D2D",
    successBg:   "#EAF3DE",
    successText: "#3B6D11",
  },
};

export const F = {
  body: "'Open Sans',system-ui,sans-serif",
  display: "'Nunito','Poppins',sans-serif",
  sub: "'Montserrat',sans-serif",
  sig: "'Caveat',cursive",

  // Editorial/auth typography (Fraunces + Inter, loaded by App.jsx Google Fonts link)
  serif: '"Fraunces", Georgia, serif',
  sans:  '"Inter", system-ui, -apple-system, sans-serif',
  mono:  'ui-monospace, "SF Mono", Menlo, monospace',
  weight: { regular: 400, medium: 500, bold: 600 },
};

export const SC = ["#00aa9f", "#f9dd59", "#104674"];

export const STATUS = {
  draft: { label: "Draft", color: T.textDim, bg: `${T.textDim}10` },
  sent: { label: "Sent", color: T.warm, bg: T.warmSoft },
  in_progress: { label: "In Progress", color: T.accent, bg: T.accentSoft },
  completed: { label: "Completed", color: T.success, bg: T.successSoft },
  declined: { label: "Declined", color: T.error, bg: T.errorSoft },
};

export const EMAIL_STATUS = {
  sending: { label: "Sending", color: T.warm, bg: T.warmSoft },
  delivered: { label: "Delivered", color: T.accent, bg: T.accentSoft },
  opened: { label: "Opened", color: T.success, bg: T.successSoft },
  bounced: { label: "Bounced", color: T.error, bg: T.errorSoft },
};

export const FTYPES = [
  { id: "signature", label: "Signature", icon: "M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z", color: T.accent, w: 200, h: 50 },
  { id: "initials", label: "Initials", icon: "M4 7V4h16v3M9 20h6M12 4v16", color: T.purple, w: 80, h: 40 },
  { id: "date", label: "Date", icon: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z", color: T.warm, w: 140, h: 36 },
  { id: "text", label: "Text", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6", color: T.success, w: 160, h: 36 },
];
