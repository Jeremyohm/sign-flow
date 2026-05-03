import { useState, useMemo } from "react";
import { useTheme } from "../../App";
import { Ic, Btn, PageContainer, PageHeader, BackBtn } from "../../components/ui";
import { calculateCombinedRating, COMPENSATION_RATES, DEPENDENT_ADDITIONS } from "../../data/vaConditions";

export function RatingCalculator() {
  const { T } = useTheme();
  const [ratings, setRatings] = useState([{ value: "", label: "" }]);
  const [bilateral, setBilateral] = useState(false);
  const [dependents, setDependents] = useState({ spouse: false, children: 0, parents: 0 });

  const validRatings = ratings.map(r => parseInt(r.value)).filter(v => !isNaN(v) && v >= 0 && v <= 100);
  const result = useMemo(() => calculateCombinedRating(validRatings, bilateral), [validRatings, bilateral]);

  const monthlyBase = COMPENSATION_RATES[result.rounded] || 0;
  const depAdditions = DEPENDENT_ADDITIONS[result.rounded] || { spouse: 0, child: 0, parent: 0 };
  const monthlyTotal = monthlyBase
    + (dependents.spouse ? depAdditions.spouse : 0)
    + (dependents.children * depAdditions.child)
    + (dependents.parents * depAdditions.parent);

  const addRating = () => setRatings(p => [...p, { value: "", label: "" }]);
  const removeRating = (i) => setRatings(p => p.filter((_, idx) => idx !== i));
  const updateRating = (i, field, val) => setRatings(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <PageContainer>
      <BackBtn to="/va" label="Back to VA Benefits" />
      <PageHeader title="VA Rating Calculator" subtitle="Calculate your combined disability rating using official VA math" />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
        {/* Input Section */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24 }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: T.text }}>Your Disabilities</h3>

          {ratings.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
              <input
                type="text" placeholder="Condition name (optional)"
                value={r.label} onChange={e => updateRating(i, "label", e.target.value)}
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit", outline: "none",
                }}
              />
              <select
                value={r.value} onChange={e => updateRating(i, "value", e.target.value)}
                style={{
                  width: 80, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.bg, color: T.text, fontSize: 13, fontFamily: "inherit",
                }}
              >
                <option value="">%</option>
                {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(v => (
                  <option key={v} value={v}>{v}%</option>
                ))}
              </select>
              {ratings.length > 1 && (
                <button onClick={() => removeRating(i)} style={{
                  border: "none", background: T.errorSoft, color: T.error, borderRadius: 6,
                  padding: "6px 8px", cursor: "pointer", fontSize: 12, fontWeight: 600,
                }}>&times;</button>
              )}
            </div>
          ))}

          <button onClick={addRating} style={{
            width: "100%", padding: "10px", borderRadius: 8, border: `1px dashed ${T.border}`,
            background: "transparent", color: T.accent, fontSize: 13, fontWeight: 600,
            cursor: "pointer", marginTop: 4,
          }}>+ Add Disability</button>

          {/* Bilateral Factor */}
          <label style={{
            display: "flex", alignItems: "center", gap: 8, marginTop: 16,
            fontSize: 13, color: T.textSec, cursor: "pointer",
          }}>
            <input type="checkbox" checked={bilateral} onChange={e => setBilateral(e.target.checked)} />
            Apply bilateral factor (paired body parts affected)
          </label>

          {/* Dependents */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: T.text }}>
              Dependents <span style={{ fontWeight: 400, color: T.textDim }}>(affects rates at 30%+)</span>
            </h4>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: T.textSec, marginBottom: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={dependents.spouse} onChange={e => setDependents(p => ({ ...p, spouse: e.target.checked }))} />
              Spouse
            </label>
            <div style={{ display: "flex", gap: 16 }}>
              <label style={{ fontSize: 13, color: T.textSec, display: "flex", alignItems: "center", gap: 6 }}>
                Children:
                <select value={dependents.children} onChange={e => setDependents(p => ({ ...p, children: parseInt(e.target.value) }))}
                  style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 13 }}>
                  {[0, 1, 2, 3, 4, 5, 6].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
              <label style={{ fontSize: 13, color: T.textSec, display: "flex", alignItems: "center", gap: 6 }}>
                Dependent parents:
                <select value={dependents.parents} onChange={e => setDependents(p => ({ ...p, parents: parseInt(e.target.value) }))}
                  style={{ padding: "4px 8px", borderRadius: 6, border: `1px solid ${T.border}`, background: T.bg, color: T.text, fontSize: 13 }}>
                  {[0, 1, 2].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div>
          {/* Combined Rating */}
          <div style={{
            background: T.surface, border: `1px solid ${T.accent}33`, borderRadius: 12, padding: 24, marginBottom: 16,
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
                Combined VA Rating
              </div>
              <div style={{ fontSize: 56, fontWeight: 700, color: T.accent, lineHeight: 1.1, marginTop: 8 }}>
                {result.rounded}%
              </div>
              {validRatings.length > 1 && (
                <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>
                  Exact: {result.exact}% &rarr; rounded to {result.rounded}%
                </div>
              )}
            </div>
          </div>

          {/* Monthly Compensation */}
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, marginBottom: 16,
          }}>
            <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: T.text }}>Estimated Monthly Compensation</h4>
            <div style={{ fontSize: 32, fontWeight: 700, color: T.warm }}>
              ${monthlyTotal.toFixed(2)}
            </div>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>per month, tax-free</div>
            {monthlyBase > 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: T.textSec }}>
                <div>Base rate: ${monthlyBase.toFixed(2)}</div>
                {dependents.spouse && <div>+ Spouse: ${depAdditions.spouse.toFixed(2)}</div>}
                {dependents.children > 0 && <div>+ Children ({dependents.children}): ${(dependents.children * depAdditions.child).toFixed(2)}</div>}
                {dependents.parents > 0 && <div>+ Parents ({dependents.parents}): ${(dependents.parents * depAdditions.parent).toFixed(2)}</div>}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 11, color: T.textDim, fontStyle: "italic" }}>
              Estimated annual: ${(monthlyTotal * 12).toFixed(2)}
            </div>
          </div>

          {/* VA Math Breakdown */}
          {result.steps && result.steps.length > 1 && (
            <div style={{
              background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24,
            }}>
              <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 700, color: T.text }}>How VA Math Works</h4>
              <div style={{ fontSize: 12, color: T.textSec, lineHeight: 1.8 }}>
                {result.steps.map((step, i) => (
                  <div key={i}>
                    <span style={{ color: T.accent, fontWeight: 600 }}>Step {i + 1}:</span>{" "}
                    {ratings[i]?.label || `Disability ${i + 1}`} at {step.rating}% &times; {step.remaining}% remaining = {step.contribution}% contribution
                  </div>
                ))}
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${T.border}`, fontWeight: 600, color: T.text }}>
                  Total: {result.exact}% &rarr; rounded to {result.rounded}%
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
