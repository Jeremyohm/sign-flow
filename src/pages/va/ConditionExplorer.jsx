import { useState, useMemo } from "react";
import { useTheme } from "../../App";
import { Ic, PageContainer, PageHeader, BackBtn, Badge } from "../../components/ui";
import { CONDITIONS, CATEGORIES } from "../../data/vaConditions";

export function ConditionExplorer() {
  const { T } = useTheme();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [expandedId, setExpandedId] = useState(null);

  const filtered = useMemo(() => {
    let list = CONDITIONS;
    if (selectedCategory !== "All") {
      list = list.filter(c => c.category === selectedCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.bodySystem.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, selectedCategory]);

  const getSecondaryNames = (codes) => {
    return codes.map(code => {
      const found = CONDITIONS.find(c => c.id === code);
      return found ? { code, name: found.name } : { code, name: `DC ${code}` };
    });
  };

  const catColors = {
    Musculoskeletal: T.accent, "Mental Health": T.purple, Neurological: T.warm,
    Respiratory: T.success, Cardiovascular: T.error, Endocrine: T.warm,
    Auditory: T.purple, Skin: T.accent, Digestive: T.warm,
  };

  return (
    <PageContainer>
      <BackBtn to="/va" label="Back to VA Benefits" />
      <PageHeader title="Condition Explorer" subtitle="Browse VA diagnostic codes, rating criteria, and secondary conditions" />

      {/* Search & Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          type="text" placeholder="Search conditions, codes, or body systems..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: 250, padding: "10px 14px", borderRadius: 8,
            border: `1px solid ${T.border}`, background: T.surface, color: T.text,
            fontSize: 13, fontFamily: "inherit", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {["All", ...CATEGORIES].map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)} style={{
              padding: "6px 12px", borderRadius: 6, border: `1px solid ${selectedCategory === cat ? T.accent : T.border}`,
              background: selectedCategory === cat ? T.accentSoft : "transparent",
              color: selectedCategory === cat ? T.accent : T.textSec,
              fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            }}>{cat}</button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 12, color: T.textDim, marginBottom: 16 }}>
        Showing {filtered.length} of {CONDITIONS.length} conditions
      </div>

      {/* Condition List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filtered.map(condition => {
          const isExpanded = expandedId === condition.id;
          const color = catColors[condition.category] || T.accent;

          return (
            <div key={condition.id} style={{
              background: T.surface, border: `1px solid ${isExpanded ? color + "44" : T.border}`,
              borderRadius: 10, overflow: "hidden", transition: "all 0.15s",
            }}>
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : condition.id)}
                style={{
                  width: "100%", padding: "14px 18px", border: "none", background: "transparent",
                  display: "flex", alignItems: "center", gap: 12, cursor: "pointer", textAlign: "left",
                }}
              >
                <div style={{
                  minWidth: 48, padding: "3px 8px", borderRadius: 5, background: color + "15",
                  fontSize: 11, fontWeight: 700, color, textAlign: "center", fontFamily: "monospace",
                }}>
                  {condition.code}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{condition.name}</div>
                  <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                    {condition.category} &bull; {condition.bodySystem}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {condition.ratings.map(r => (
                    <span key={r} style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                      background: T.accentSoft, color: T.accent,
                    }}>{r}%</span>
                  ))}
                </div>
                <Ic d={isExpanded ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} size={16} color={T.textDim} s />
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${T.border}` }}>
                  {/* Rating Criteria */}
                  <div style={{ marginTop: 14 }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: T.text }}>Rating Criteria</h4>
                    <p style={{ margin: 0, fontSize: 13, color: T.textSec, lineHeight: 1.6 }}>{condition.criteria}</p>
                  </div>

                  {/* C&P Tips */}
                  <div style={{
                    marginTop: 14, background: T.accentSoft, borderRadius: 8, padding: 14,
                  }}>
                    <h4 style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 700, color: T.accent }}>
                      C&P Exam Tips
                    </h4>
                    <p style={{ margin: 0, fontSize: 12, color: T.textSec, lineHeight: 1.6 }}>{condition.cpTips}</p>
                  </div>

                  {/* Secondary Conditions */}
                  {condition.commonSecondary.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: T.text }}>
                        Common Secondary Conditions
                      </h4>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {getSecondaryNames(condition.commonSecondary).map(sec => (
                          <button
                            key={sec.code}
                            onClick={() => {
                              setExpandedId(sec.code);
                              setSearch("");
                              setSelectedCategory("All");
                            }}
                            style={{
                              padding: "5px 10px", borderRadius: 6, fontSize: 12,
                              border: `1px solid ${T.purple}33`, background: T.purpleSoft,
                              color: T.purple, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                            }}
                          >
                            {sec.code} — {sec.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, color: T.textDim }}>
          <p style={{ fontSize: 14 }}>No conditions found matching your search.</p>
          <p style={{ fontSize: 12 }}>Try a different search term or category filter.</p>
        </div>
      )}
    </PageContainer>
  );
}
