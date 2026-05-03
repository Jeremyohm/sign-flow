import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../App";
import { Ic, Btn, PageContainer, PageHeader } from "../../components/ui";

const DISCLAIMER = "This tool provides general educational information about VA disability benefits. It does not constitute legal advice and is not a substitute for working with a VA-accredited representative, attorney, or Veterans Service Organization (VSO).";

const TOOLS = [
  {
    id: "calculator",
    path: "/va/calculator",
    title: "Rating Calculator",
    desc: "Calculate your combined VA disability rating using official VA math. See estimated monthly compensation with dependent adjustments.",
    icon: "M4 4h16v16H4zM9 9h6M9 13h4M9 17h2",
    color: "accent",
  },
  {
    id: "conditions",
    path: "/va/conditions",
    title: "Condition Explorer",
    desc: "Browse VA diagnostic codes, understand rating criteria for each condition, and discover secondary conditions that may apply to you.",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6M9 14l2 2 4-4",
    color: "purple",
  },
  {
    id: "claim-builder",
    path: "/va/claim-builder",
    title: "Claim Builder",
    desc: "Step-by-step guided workflow to organize your evidence, write personal statements, and prepare buddy letters for a strong claim.",
    icon: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
    color: "warm",
  },
  {
    id: "cp-prep",
    path: "/va/cp-prep",
    title: "C&P Exam Prep",
    desc: "Condition-specific guides for your Compensation & Pension exam. Know what the examiner will assess and how to describe your symptoms.",
    icon: "M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M12 11h4M12 16h4M8 11h.01M8 16h.01M15 1H9v4h6V1z",
    color: "success",
  },
];

const STATS = [
  { label: "Diagnostic Codes", value: "700+", sub: "in VA rating schedule" },
  { label: "Average Claim Time", value: "81-125", sub: "days to decision" },
  { label: "Max Monthly Rate", value: "$3,832", sub: "at 100% (2026)" },
  { label: "PACT Act Conditions", value: "30+", sub: "presumptive conditions" },
];

export function VaBenefits() {
  const navigate = useNavigate();
  const { T } = useTheme();
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const colorMap = { accent: T.accent, purple: T.purple, warm: T.warm, success: T.success };
  const softMap = { accent: T.accentSoft, purple: T.purpleSoft, warm: T.warmSoft, success: T.successSoft };

  return (
    <PageContainer>
      <PageHeader title="Veteran Benefits Guide" subtitle="Educational tools to help you understand and navigate the VA disability claim process" />

      {showDisclaimer && (
        <div style={{
          background: T.warmSoft, border: `1px solid ${T.warning}33`, borderRadius: 10,
          padding: "14px 18px", marginBottom: 24, display: "flex", gap: 12, alignItems: "flex-start",
        }}>
          <Ic d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" size={20} color={T.warning} s />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: T.warning, fontWeight: 600, margin: "0 0 4px" }}>Important Disclaimer</p>
            <p style={{ fontSize: 12, color: T.textSec, margin: 0, lineHeight: 1.5 }}>{DISCLAIMER}</p>
          </div>
          <button onClick={() => setShowDisclaimer(false)} style={{
            border: "none", background: "transparent", cursor: "pointer", padding: 4,
            color: T.textDim, fontSize: 16, lineHeight: 1,
          }}>&times;</button>
        </div>
      )}

      {/* Stats */}
      <div className="sf-stat-grid" style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 28,
      }}>
        {STATS.map(s => (
          <div key={s.label} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10,
            padding: "16px 18px", textAlign: "center",
          }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.accent }}>{s.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.text, marginTop: 2 }}>{s.label}</div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tool Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 28 }}>
        {TOOLS.map(tool => (
          <button key={tool.id} onClick={() => navigate(tool.path)} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: 24, textAlign: "left", cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", gap: 12,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colorMap[tool.color]; e.currentTarget.style.boxShadow = T.shadowMd; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: 10, background: softMap[tool.color],
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Ic d={tool.icon} size={22} color={colorMap[tool.color]} s />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: T.text }}>{tool.title}</h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: T.textSec, lineHeight: 1.5 }}>{tool.desc}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: "auto" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: colorMap[tool.color] }}>Open tool</span>
              <Ic d="M9 18l6-6-6-6" size={14} color={colorMap[tool.color]} s />
            </div>
          </button>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.text }}>Official VA Resources</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {[
            { label: "VA.gov Disability Claims", url: "https://www.va.gov/disability/" },
            { label: "Find a VSO", url: "https://www.va.gov/vso/" },
            { label: "Check Claim Status", url: "https://www.va.gov/claim-or-appeal-status/" },
            { label: "PACT Act Info", url: "https://www.va.gov/resources/the-pact-act-and-your-va-benefits/" },
          ].map(link => (
            <a key={link.label} href={link.url} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 12, fontWeight: 600, color: T.accent, background: T.accentSoft,
              padding: "6px 12px", borderRadius: 6, textDecoration: "none",
              border: `1px solid ${T.accent}22`, transition: "all 0.15s",
            }}>{link.label} &rarr;</a>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
