import { useState } from "react";
import { useTheme } from "../../App";
import { Ic, Btn, PageContainer, PageHeader, BackBtn } from "../../components/ui";
import { CONDITIONS, PACT_ACT } from "../../data/vaConditions";

const STEPS = [
  { id: "intent", label: "Intent to File", desc: "Establish your effective date" },
  { id: "conditions", label: "Identify Conditions", desc: "List all claimable conditions" },
  { id: "evidence", label: "Gather Evidence", desc: "Medical records, nexus letters, buddy letters" },
  { id: "statement", label: "Personal Statement", desc: "Write your statement in support of claim" },
  { id: "buddy", label: "Buddy Letters", desc: "Get supporting statements from witnesses" },
  { id: "review", label: "Review & Checklist", desc: "Final review before filing" },
];

const STATEMENT_PROMPTS = [
  "Describe the specific in-service event, injury, or exposure that caused or aggravated your condition.",
  "When did you first notice symptoms? Describe their onset during or after service.",
  "How have your symptoms progressed over time since leaving service?",
  "Describe how this condition affects your daily life (work, relationships, daily tasks, sleep, hobbies).",
  "Describe your worst days — what are flare-ups like? How often do they happen?",
  "List all treatments, medications, and therapies you've tried for this condition.",
  "Has this condition caused or worsened any other health problems?",
];

const BUDDY_PROMPTS = [
  "How do you know the veteran? Describe your relationship and how long you've known them.",
  "Describe what you've personally observed about the veteran's condition and symptoms.",
  "How have you seen this condition affect their daily life, work, or relationships?",
  "Have you noticed changes in the veteran's behavior, mood, or physical abilities over time?",
  "Describe any specific incidents where you witnessed the veteran struggling due to this condition.",
];

export function ClaimBuilder() {
  const { T } = useTheme();
  const [step, setStep] = useState(0);
  const [claim, setClaim] = useState({
    intentDate: "",
    conditions: [{ name: "", type: "primary", notes: "" }],
    statement: STATEMENT_PROMPTS.map(() => ""),
    buddyLetters: [{ name: "", relationship: "", responses: BUDDY_PROMPTS.map(() => "") }],
    evidenceChecklist: {},
  });

  const currentStep = STEPS[step];

  const updateCondition = (i, field, val) => {
    setClaim(p => ({
      ...p,
      conditions: p.conditions.map((c, idx) => idx === i ? { ...c, [field]: val } : c),
    }));
  };

  const addCondition = () => {
    setClaim(p => ({
      ...p,
      conditions: [...p.conditions, { name: "", type: "primary", notes: "" }],
    }));
  };

  const updateStatement = (i, val) => {
    setClaim(p => ({
      ...p,
      statement: p.statement.map((s, idx) => idx === i ? val : s),
    }));
  };

  const updateBuddyResponse = (bi, ri, val) => {
    setClaim(p => ({
      ...p,
      buddyLetters: p.buddyLetters.map((b, idx) => idx === bi ? {
        ...b,
        responses: b.responses.map((r, ridx) => ridx === ri ? val : r),
      } : b),
    }));
  };

  const EVIDENCE_ITEMS = [
    { id: "str", label: "Service Treatment Records (STRs)" },
    { id: "dd214", label: "DD-214 (Discharge papers)" },
    { id: "medical", label: "Private medical records" },
    { id: "nexus", label: "Nexus letter(s) from medical provider" },
    { id: "dbq", label: "Disability Benefits Questionnaire (DBQ)" },
    { id: "buddy", label: "Buddy / lay statements" },
    { id: "personal", label: "Personal statement" },
    { id: "photos", label: "Photos or documentation of condition" },
    { id: "work", label: "Employment records showing impact" },
  ];

  const toggleChecklist = (id) => {
    setClaim(p => ({
      ...p,
      evidenceChecklist: { ...p.evidenceChecklist, [id]: !p.evidenceChecklist[id] },
    }));
  };

  return (
    <PageContainer>
      <BackBtn to="/va" label="Back to VA Benefits" />
      <PageHeader title="Claim Builder" subtitle="Step-by-step guide to organizing a strong VA disability claim" />

      {/* Progress Steps */}
      <div style={{
        display: "flex", gap: 4, marginBottom: 28, background: T.surface,
        border: `1px solid ${T.border}`, borderRadius: 10, padding: 6, overflowX: "auto",
      }}>
        {STEPS.map((s, i) => (
          <button key={s.id} onClick={() => setStep(i)} style={{
            flex: 1, padding: "10px 12px", borderRadius: 7, border: "none",
            background: i === step ? T.accentSoft : i < step ? T.successSoft : "transparent",
            color: i === step ? T.accent : i < step ? T.success : T.textDim,
            fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            whiteSpace: "nowrap", transition: "all 0.15s",
          }}>
            <span style={{ marginRight: 6 }}>{i < step ? "\u2713" : i + 1}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 28 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 700, color: T.text }}>{currentStep.label}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: T.textSec }}>{currentStep.desc}</p>

        {/* Step 0: Intent to File */}
        {step === 0 && (
          <div>
            <div style={{
              background: T.accentSoft, borderRadius: 10, padding: 16, marginBottom: 20,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
                <strong style={{ color: T.accent }}>Why this matters:</strong> Filing an Intent to File (VA Form 21-0966)
                establishes your <strong>effective date</strong> for benefits. You then have <strong>1 year</strong> to submit
                your full claim. Any benefits awarded will be backdated to this date.
              </p>
            </div>
            <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>
              Intent to File Date
            </label>
            <input
              type="date" value={claim.intentDate}
              onChange={e => setClaim(p => ({ ...p, intentDate: e.target.value }))}
              style={{
                padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
                background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit",
              }}
            />
            <p style={{ fontSize: 12, color: T.textDim, marginTop: 8 }}>
              File online at <a href="https://www.va.gov/disability/how-to-file-claim/" target="_blank" rel="noopener noreferrer" style={{ color: T.accent }}>VA.gov</a> or
              call 1-800-827-1000. Record the date you filed here for tracking.
            </p>
          </div>
        )}

        {/* Step 1: Identify Conditions */}
        {step === 1 && (
          <div>
            {claim.conditions.map((c, i) => (
              <div key={i} style={{
                padding: 16, border: `1px solid ${T.border}`, borderRadius: 10, marginBottom: 12,
              }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                  <input
                    type="text" placeholder="Condition name (e.g., PTSD, knee pain, tinnitus)"
                    value={c.name} onChange={e => updateCondition(i, "name", e.target.value)}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <select value={c.type} onChange={e => updateCondition(i, "type", e.target.value)}
                    style={{
                      padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit",
                    }}>
                    <option value="primary">Primary</option>
                    <option value="secondary">Secondary</option>
                    <option value="increase">Increase</option>
                    <option value="presumptive">Presumptive</option>
                  </select>
                </div>
                <textarea
                  placeholder="Notes: How is this condition connected to your service?"
                  value={c.notes} onChange={e => updateCondition(i, "notes", e.target.value)}
                  rows={2}
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                    background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit",
                    resize: "vertical", outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            ))}
            <button onClick={addCondition} style={{
              width: "100%", padding: 12, borderRadius: 8, border: `1px dashed ${T.border}`,
              background: "transparent", color: T.accent, fontSize: 13, fontWeight: 600,
              cursor: "pointer",
            }}>+ Add Another Condition</button>

            {/* PACT Act Quick Check */}
            <div style={{
              marginTop: 20, background: T.warmSoft, borderRadius: 10, padding: 16,
              border: `1px solid ${T.warning}22`,
            }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.warning }}>
                PACT Act — Presumptive Conditions
              </h4>
              <p style={{ margin: "0 0 12px", fontSize: 12, color: T.textSec }}>
                If you served in these areas, certain conditions are presumed service-connected:
              </p>
              {Object.values(PACT_ACT).map(group => (
                <details key={group.label} style={{ marginBottom: 8 }}>
                  <summary style={{ fontSize: 12, fontWeight: 600, color: T.text, cursor: "pointer" }}>
                    {group.label}
                  </summary>
                  <div style={{ padding: "8px 0 0 16px", fontSize: 12, color: T.textSec }}>
                    <div style={{ marginBottom: 4 }}>
                      <strong>Service locations:</strong> {group.serviceLocations.join(", ")}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                      {group.conditions.map(c => (
                        <span key={c} style={{
                          padding: "2px 8px", borderRadius: 4, background: T.surface,
                          border: `1px solid ${T.border}`, fontSize: 11,
                        }}>{c}</span>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Gather Evidence */}
        {step === 2 && (
          <div>
            <div style={{
              background: T.accentSoft, borderRadius: 10, padding: 16, marginBottom: 20,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
                <strong style={{ color: T.accent }}>Fully Developed Claim (FDC):</strong> Submitting all evidence
                upfront with your claim can significantly speed up the process. The VA won't need to request
                additional records, which can save weeks or months.
              </p>
            </div>
            <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: T.text }}>Evidence Checklist</h4>
            {EVIDENCE_ITEMS.map(item => (
              <label key={item.id} style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
                borderRadius: 8, marginBottom: 4, cursor: "pointer",
                background: claim.evidenceChecklist[item.id] ? T.successSoft : "transparent",
                border: `1px solid ${claim.evidenceChecklist[item.id] ? T.success + "33" : T.border}`,
                transition: "all 0.15s",
              }}>
                <input type="checkbox" checked={!!claim.evidenceChecklist[item.id]}
                  onChange={() => toggleChecklist(item.id)} />
                <span style={{
                  fontSize: 13, color: claim.evidenceChecklist[item.id] ? T.success : T.text,
                  fontWeight: claim.evidenceChecklist[item.id] ? 600 : 400,
                  textDecoration: claim.evidenceChecklist[item.id] ? "line-through" : "none",
                }}>{item.label}</span>
              </label>
            ))}
            <div style={{ marginTop: 12, fontSize: 12, color: T.textDim }}>
              {Object.values(claim.evidenceChecklist).filter(Boolean).length} of {EVIDENCE_ITEMS.length} items collected
            </div>
          </div>
        )}

        {/* Step 3: Personal Statement */}
        {step === 3 && (
          <div>
            <div style={{
              background: T.purpleSoft, borderRadius: 10, padding: 16, marginBottom: 20,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
                <strong style={{ color: T.purple }}>Your personal statement</strong> is one of the most important
                pieces of evidence. Answer each prompt below to build a comprehensive statement. Be specific —
                include dates, locations, and concrete examples.
              </p>
            </div>
            {STATEMENT_PROMPTS.map((prompt, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: T.text, display: "block", marginBottom: 6 }}>
                  {i + 1}. {prompt}
                </label>
                <textarea
                  value={claim.statement[i]}
                  onChange={e => updateStatement(i, e.target.value)}
                  rows={3}
                  placeholder="Type your response here..."
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8, border: `1px solid ${T.border}`,
                    background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit",
                    resize: "vertical", outline: "none", boxSizing: "border-box", lineHeight: 1.5,
                  }}
                />
              </div>
            ))}
          </div>
        )}

        {/* Step 4: Buddy Letters */}
        {step === 4 && (
          <div>
            <div style={{
              background: T.warmSoft, borderRadius: 10, padding: 16, marginBottom: 20,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
                <strong style={{ color: T.warning }}>Buddy/lay statements</strong> from people who have witnessed
                your condition can strengthen your claim. These could be from fellow service members, family,
                friends, coworkers, or anyone who has observed your symptoms.
              </p>
            </div>
            {claim.buddyLetters.map((buddy, bi) => (
              <div key={bi} style={{
                border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 16,
              }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                  <input
                    type="text" placeholder="Buddy's full name"
                    value={buddy.name}
                    onChange={e => setClaim(p => ({
                      ...p,
                      buddyLetters: p.buddyLetters.map((b, idx) => idx === bi ? { ...b, name: e.target.value } : b),
                    }))}
                    style={{
                      flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                    }}
                  />
                  <input
                    type="text" placeholder="Relationship"
                    value={buddy.relationship}
                    onChange={e => setClaim(p => ({
                      ...p,
                      buddyLetters: p.buddyLetters.map((b, idx) => idx === bi ? { ...b, relationship: e.target.value } : b),
                    }))}
                    style={{
                      width: 160, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                      background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                    }}
                  />
                </div>
                {BUDDY_PROMPTS.map((prompt, ri) => (
                  <div key={ri} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: T.textSec, display: "block", marginBottom: 4 }}>
                      {prompt}
                    </label>
                    <textarea
                      value={buddy.responses[ri]}
                      onChange={e => updateBuddyResponse(bi, ri, e.target.value)}
                      rows={2} placeholder="Type response here..."
                      style={{
                        width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                        background: T.bg, color: T.text, fontSize: 12, fontFamily: "inherit",
                        resize: "vertical", outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                ))}
              </div>
            ))}
            <button onClick={() => setClaim(p => ({
              ...p,
              buddyLetters: [...p.buddyLetters, { name: "", relationship: "", responses: BUDDY_PROMPTS.map(() => "") }],
            }))} style={{
              width: "100%", padding: 12, borderRadius: 8, border: `1px dashed ${T.border}`,
              background: "transparent", color: T.accent, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>+ Add Another Buddy Letter</button>
          </div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <div>
            <div style={{
              background: T.successSoft, borderRadius: 10, padding: 16, marginBottom: 20,
            }}>
              <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>
                <strong style={{ color: T.success }}>Review your claim package.</strong> Make sure everything
                is complete before filing. You can go back to any step to make changes.
              </p>
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>
                Intent to File: {claim.intentDate || "Not recorded"}
              </h4>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>
                Conditions ({claim.conditions.filter(c => c.name).length})
              </h4>
              {claim.conditions.filter(c => c.name).map((c, i) => (
                <div key={i} style={{
                  padding: "8px 12px", borderRadius: 6, border: `1px solid ${T.border}`,
                  marginBottom: 4, fontSize: 13, color: T.text, display: "flex", gap: 8,
                }}>
                  <span style={{
                    padding: "1px 6px", borderRadius: 4, fontSize: 11, fontWeight: 600,
                    background: c.type === "primary" ? T.accentSoft : c.type === "secondary" ? T.purpleSoft : T.warmSoft,
                    color: c.type === "primary" ? T.accent : c.type === "secondary" ? T.purple : T.warm,
                  }}>{c.type}</span>
                  {c.name}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>
                Evidence: {Object.values(claim.evidenceChecklist).filter(Boolean).length}/{EVIDENCE_ITEMS.length} items
              </h4>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>
                Personal Statement: {claim.statement.filter(s => s.trim()).length}/{STATEMENT_PROMPTS.length} prompts answered
              </h4>
            </div>

            <div style={{ marginBottom: 16 }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: T.text }}>
                Buddy Letters: {claim.buddyLetters.filter(b => b.name).length}
              </h4>
            </div>

            {/* Filing Links */}
            <div style={{
              marginTop: 20, padding: 16, borderRadius: 10, border: `1px solid ${T.accent}33`,
              background: T.accentSoft,
            }}>
              <h4 style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: T.accent }}>Ready to File?</h4>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: T.textSec }}>
                Submit your claim through one of these official channels:
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <a href="https://www.va.gov/disability/file-disability-claim-form-21-526ez/" target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px", borderRadius: 8, background: T.accent, color: T.white,
                    fontSize: 13, fontWeight: 600, textDecoration: "none",
                  }}>File Online at VA.gov</a>
                <a href="https://www.va.gov/vso/" target="_blank" rel="noopener noreferrer"
                  style={{
                    padding: "8px 16px", borderRadius: 8, background: T.surface, color: T.accent,
                    fontSize: 13, fontWeight: 600, textDecoration: "none", border: `1px solid ${T.accent}`,
                  }}>Find a VSO for Help</a>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div style={{
          display: "flex", justifyContent: "space-between", marginTop: 24, paddingTop: 16,
          borderTop: `1px solid ${T.border}`,
        }}>
          <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}
            style={{
              padding: "10px 20px", borderRadius: 8, border: `1px solid ${T.border}`,
              background: "transparent", color: step === 0 ? T.textDim : T.text,
              fontSize: 13, fontWeight: 600, cursor: step === 0 ? "default" : "pointer",
              fontFamily: "inherit", opacity: step === 0 ? 0.5 : 1,
            }}>Previous</button>
          <button onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))} disabled={step === STEPS.length - 1}
            style={{
              padding: "10px 20px", borderRadius: 8, border: "none",
              background: step === STEPS.length - 1 ? T.textDim : T.accent,
              color: T.white, fontSize: 13, fontWeight: 600,
              cursor: step === STEPS.length - 1 ? "default" : "pointer",
              fontFamily: "inherit", opacity: step === STEPS.length - 1 ? 0.5 : 1,
            }}>Next Step</button>
        </div>
      </div>
    </PageContainer>
  );
}
