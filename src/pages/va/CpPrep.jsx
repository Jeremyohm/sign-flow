import { useState } from "react";
import { useTheme } from "../../App";
import { Ic, PageContainer, PageHeader, BackBtn } from "../../components/ui";
import { CONDITIONS, CATEGORIES } from "../../data/vaConditions";

const GENERAL_TIPS = [
  { title: "Be Honest and Thorough", desc: "Describe your worst days, not your best. The examiner needs to understand the full impact of your condition. Don't minimize symptoms." },
  { title: "Describe Functional Impact", desc: "Focus on how conditions affect daily life: work, relationships, sleep, hobbies, chores. The VA rates based on functional impairment, not just diagnosis." },
  { title: "Report Flare-ups", desc: "Describe frequency, severity, and duration of flare-ups. What triggers them? What do you do during a flare-up? How long until you recover?" },
  { title: "Bring Documentation", desc: "Bring copies of medical records, a personal statement, medication list, and any buddy letters. Have dates and details ready." },
  { title: "Don't Push Through Pain", desc: "If range of motion testing causes pain, say so. Don't push through it to show toughness. Stop when it hurts and tell the examiner." },
  { title: "Mental Health Exams", desc: "Be open about symptoms even if uncomfortable. Describe sleep patterns, nightmares, avoidance behaviors, irritability, and social isolation. Mention worst episodes." },
  { title: "Arrive Early, Stay Calm", desc: "The exam is not adversarial. The examiner is documenting your condition. Being cooperative and detailed helps your case." },
];

const EXAM_DAY_CHECKLIST = [
  "Photo ID and VA appointment letter",
  "List of all current medications and dosages",
  "Copy of personal statement",
  "Copy of buddy letters",
  "Medical records (bring copies, not originals)",
  "Headache/pain diary (if applicable)",
  "CPAP compliance data (if sleep apnea)",
  "List of conditions being examined",
  "Names and contact info for treating physicians",
  "Notes on worst symptoms and flare-ups",
];

export function CpPrep() {
  const { T } = useTheme();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState(null);
  const [checklist, setChecklist] = useState({});

  const filtered = selectedCategory === "All"
    ? CONDITIONS
    : CONDITIONS.filter(c => c.category === selectedCategory);

  return (
    <PageContainer>
      <BackBtn to="/va" label="Back to VA Benefits" />
      <PageHeader title="C&P Exam Preparation" subtitle="Know what to expect and how to present your case effectively" />

      {/* General Tips */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>
          General C&P Exam Tips
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {GENERAL_TIPS.map((tip, i) => (
            <div key={i} style={{
              padding: 14, borderRadius: 8, border: `1px solid ${T.border}`, background: T.bg,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.accent, marginBottom: 4 }}>
                {tip.title}
              </div>
              <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5 }}>{tip.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Exam Day Checklist */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: 24, marginBottom: 24,
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>
          Exam Day Checklist
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 6 }}>
          {EXAM_DAY_CHECKLIST.map((item, i) => (
            <label key={i} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              borderRadius: 6, cursor: "pointer",
              background: checklist[i] ? T.successSoft : "transparent",
              border: `1px solid ${checklist[i] ? T.success + "33" : "transparent"}`,
            }}>
              <input type="checkbox" checked={!!checklist[i]}
                onChange={() => setChecklist(p => ({ ...p, [i]: !p[i] }))} />
              <span style={{
                fontSize: 13, color: checklist[i] ? T.success : T.text,
                textDecoration: checklist[i] ? "line-through" : "none",
              }}>{item}</span>
            </label>
          ))}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: T.textDim }}>
          {Object.values(checklist).filter(Boolean).length}/{EXAM_DAY_CHECKLIST.length} items ready
        </div>
      </div>

      {/* Condition-Specific Prep */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
        padding: 24,
      }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: T.text }}>
          Condition-Specific Exam Guides
        </h3>

        {/* Category Filter */}
        <div style={{ display: "flex", gap: 4, marginBottom: 16, flexWrap: "wrap" }}>
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: "5px 10px", borderRadius: 6, border: `1px solid ${selectedCategory === cat ? T.accent : T.border}`,
              background: selectedCategory === cat ? T.accentSoft : "transparent",
              color: selectedCategory === cat ? T.accent : T.textSec,
              fontSize: 11, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{cat}</button>
          ))}
        </div>

        {/* Condition Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {filtered.map(condition => {
            const isExpanded = expandedId === condition.id;
            return (
              <div key={condition.id} style={{
                border: `1px solid ${isExpanded ? T.accent + "44" : T.border}`,
                borderRadius: 8, overflow: "hidden",
              }}>
                <button onClick={() => setExpandedId(isExpanded ? null : condition.id)} style={{
                  width: "100%", padding: "12px 16px", border: "none", background: isExpanded ? T.accentSoft : "transparent",
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: T.accent, fontFamily: "monospace" }}>{condition.code}</span>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: T.text }}>{condition.name}</span>
                  <span style={{ fontSize: 11, color: T.textDim }}>{condition.category}</span>
                  <Ic d={isExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} size={14} color={T.textDim} s />
                </button>
                {isExpanded && (
                  <div style={{ padding: "12px 16px", borderTop: `1px solid ${T.border}` }}>
                    <div style={{
                      background: T.accentSoft, borderRadius: 8, padding: 14, marginBottom: 12,
                    }}>
                      <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: T.accent }}>
                        What the Examiner Will Assess
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: T.textSec, lineHeight: 1.6 }}>{condition.criteria}</p>
                    </div>
                    <div style={{
                      background: T.purpleSoft, borderRadius: 8, padding: 14,
                    }}>
                      <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: T.purple }}>
                        Tips for Your Exam
                      </h4>
                      <p style={{ margin: 0, fontSize: 12, color: T.textSec, lineHeight: 1.6 }}>{condition.cpTips}</p>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.textDim }}>Possible ratings: </span>
                      {condition.ratings.map(r => (
                        <span key={r} style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                          background: T.accentSoft, color: T.accent, marginRight: 4,
                        }}>{r}%</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PageContainer>
  );
}
