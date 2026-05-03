import { useNavigate } from "react-router-dom";
import { F, SC } from "../theme";
import { useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Badge, Card, PageContainer, PageHeader, EmptyState } from "../components/ui";

export function Templates({ templates, setTemplates, notify }) {
  const T = useT();
  useDocTitle("Templates");
  const navigate = useNavigate();
  const deleteTemplate = (id) => {
    setTemplates(p => p.filter(t => t.id !== id));
    notify("Template deleted");
  };
  return (
    <PageContainer>
      <PageHeader title="Templates" subtitle="Reusable field layouts for common documents" />
      {templates.length === 0 && (
        <Card><EmptyState icon={I.tmpl} message="No templates yet. Save a field layout from the Prepare screen." /></Card>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {templates.map(t => (
          <Card key={t.id} hover style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ height: 80, background: T.bgWarm, borderBottom: `1px solid ${T.border}`, position: "relative", overflow: "hidden" }}>
              {t.fields.slice(0, 6).map((f, i) => (
                <div key={i} style={{
                  position: "absolute",
                  left: 12 + (f.x / 612) * 256,
                  top: 8 + (f.y / 792) * 64,
                  width: (f.w / 612) * 256,
                  height: Math.max(6, (f.h / 792) * 64),
                  background: `${SC[f.signer % 3]}25`,
                  border: `1px solid ${SC[f.signer % 3]}50`,
                  borderRadius: 2,
                }} />
              ))}
            </div>
            <div style={{ padding: "16px 18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: T.textSec, marginTop: 3, lineHeight: 1.4 }}>{t.description}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {t.signerRoles.map((r, i) => (
                  <span key={i} style={{ fontSize: 10, fontWeight: 600, color: SC[i % 3], background: `${SC[i % 3]}12`,
                    padding: "2px 8px", borderRadius: 12 }}>{r}</span>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14,
                paddingTop: 12, borderTop: `1px solid ${T.borderLight}` }}>
                <span style={{ fontSize: 11, color: T.textDim }}>{t.fields.length} fields · Used {t.usageCount}x</span>
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)}>
                    <Ic d={I.trash} size={13} color={T.error} s />
                  </Btn>
                  <Btn variant="secondary" size="sm" onClick={() => navigate(`/new?template=${t.id}`)}>
                    Use <Ic d={I.arrow} size={12} color={T.textSec} s />
                  </Btn>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </PageContainer>
  );
}
