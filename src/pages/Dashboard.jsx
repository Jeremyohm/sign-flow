import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { F, STATUS, SC } from "../theme";
import { fd, ft, useDocTitle, useT } from "../utils";
import { Ic, I, Btn, Badge, Card, PageContainer, Input } from "../components/ui";
import * as db from "../lib/db";

export function Dashboard({ envelopes, setEnvelopes, notify }) {
  const T = useT();
  useDocTitle("Documents");
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  // Categorize envelopes
  const actionNeeded = envelopes.filter(e => e.status === "sent" || e.status === "in_progress");
  const drafts = envelopes.filter(e => e.status === "draft");
  const completed = envelopes.filter(e => e.status === "completed");

  // Build activity feed from envelope events
  const activities = [];
  for (const env of envelopes) {
    if (env.status !== "draft") {
      activities.push({ type: "sent", label: `"${env.name}" sent for signing`, time: env.updatedAt || env.createdAt, envId: env.id });
    }
    for (const s of env.signers) {
      if (s.status === "signed" && s.signedAt) {
        activities.push({ type: "signed", label: `${s.name || "Signer"} signed "${env.name}"`, time: s.signedAt, envId: env.id });
      }
    }
    if (env.status === "completed") {
      activities.push({ type: "completed", label: `"${env.name}" — all signatures complete`, time: env.updatedAt, envId: env.id });
    }
  }
  activities.sort((a, b) => new Date(b.time) - new Date(a.time));
  const recentActivity = activities.slice(0, 8);

  // Filtered table
  const byStatus = filter === "all" ? envelopes : envelopes.filter(e => e.status === filter);
  const filtered = search.trim()
    ? byStatus.filter(e => e.name.toLowerCase().includes(search.toLowerCase()))
    : byStatus;

  const confirmDelete = async () => {
    try {
      await db.deleteEnvelope(deleteId);
      setEnvelopes(p => p.filter(e => e.id !== deleteId));
      notify("Envelope deleted");
    } catch (err) {
      console.error("Delete error:", err);
      notify("Failed to delete", "warning");
    }
    setDeleteId(null);
  };
  const envToDelete = deleteId ? envelopes.find(e => e.id === deleteId) : null;

  const activityIcon = (type) => {
    if (type === "signed") return I.pen;
    if (type === "completed") return I.check;
    return I.send;
  };
  const activityColor = (type) => {
    if (type === "signed") return T.accent;
    if (type === "completed") return T.success;
    return T.warm;
  };

  return (
    <PageContainer>
      {/* Header */}
      <div className="sf-page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
            <img src="/logo.png" alt="True Legacy Homes" style={{ height: 40 }} />
            <h1 style={{ fontFamily: F.display, fontSize: 26, fontWeight: 600, margin: 0 }}>Welcome back</h1>
          </div>
          <p style={{ fontSize: 13, color: T.textSec, margin: 0 }}>
            {actionNeeded.length > 0
              ? `${actionNeeded.length} document${actionNeeded.length !== 1 ? "s" : ""} need attention`
              : "All caught up — no documents need action"}
          </p>
        </div>
        <Btn onClick={() => navigate("/new")}><Ic d={I.plus} size={15} color={T.white} s /> New Envelope</Btn>
      </div>

      {/* Quick stats bar */}
      <div style={{ display: "flex", gap: 6, marginBottom: 24 }}>
        {[
          { label: "Action Needed", value: actionNeeded.length, color: T.warm, bg: T.warmSoft },
          { label: "Drafts", value: drafts.length, color: T.textDim, bg: `${T.textDim}10` },
          { label: "Completed", value: completed.length, color: T.success, bg: T.successSoft },
          { label: "Total", value: envelopes.length, color: T.accent, bg: T.accentSoft },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, display: "flex", alignItems: "center", gap: 10,
            padding: "12px 16px", borderRadius: 10, background: T.surface,
            border: `1px solid ${T.border}` }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: s.color, fontFamily: F.display }}>{s.value}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Action Needed section */}
      {actionNeeded.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.warm, animation: "pulse 2s infinite" }} />
            <h2 style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, margin: 0, color: T.text, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Action Needed
            </h2>
            <span style={{ fontSize: 11, color: T.textDim }}>({actionNeeded.length})</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {actionNeeded.map(env => {
              const signedCount = env.signers.filter(s => s.status === "signed").length;
              const totalSigners = env.signers.length;
              const progress = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0;
              const pendingSigner = env.signers.find(s => s.status === "pending");
              return (
                <Card key={env.id} hover onClick={() => navigate(`/envelope/${env.id}`)}
                  style={{ padding: 0, overflow: "hidden", cursor: "pointer" }}>
                  {/* Amber top accent */}
                  <div style={{ height: 3, background: `linear-gradient(90deg, ${T.warm}, ${T.accent})` }} />
                  <div style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, overflow: "hidden",
                          textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{env.name}</div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>
                          {env.pages} page{env.pages > 1 ? "s" : ""} · {fd(env.updatedAt)}
                        </div>
                      </div>
                      <Badge color={STATUS[env.status].color} bg={STATUS[env.status].bg}>{STATUS[env.status].label}</Badge>
                    </div>
                    {/* Signer progress */}
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: T.textDim, textTransform: "uppercase", letterSpacing: 0.3 }}>
                          Signatures
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: T.accent }}>{signedCount}/{totalSigners}</span>
                      </div>
                      <div style={{ height: 4, borderRadius: 4, background: T.bgWarm, overflow: "hidden" }}>
                        <div style={{ height: "100%", borderRadius: 4, width: `${progress}%`,
                          background: `linear-gradient(90deg, ${T.accent}, ${T.success})`,
                          transition: "width 0.4s ease" }} />
                      </div>
                    </div>
                    {/* Signer avatars */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "flex", gap: 4 }}>
                        {env.signers.map((s, i) => (
                          <div key={s.id} title={`${s.name || "Signer"} — ${s.status}`} style={{
                            width: 26, height: 26, borderRadius: "50%",
                            background: s.status === "signed" ? T.success : s.status === "pending" ? `${SC[i % 3]}25` : T.surfaceAlt,
                            color: s.status === "signed" ? T.white : s.status === "pending" ? SC[i % 3] : T.textDim,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700,
                            border: s.status === "pending" ? `2px solid ${SC[i % 3]}` : `2px solid ${T.border}`,
                          }}>
                            {s.status === "signed" ? <Ic d={I.check} size={11} color={T.white} s /> : (s.name || "?").charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <Btn size="sm" onClick={e => { e.stopPropagation(); navigate(`/sign/${env.id}`); }}>
                        <Ic d={I.pen} size={11} color={T.white} s /> Sign Now
                      </Btn>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Two column: Recent Activity + Drafts */}
      <div style={{ display: "grid", gridTemplateColumns: recentActivity.length > 0 && drafts.length > 0 ? "1.4fr 1fr" : "1fr", gap: 16, marginBottom: 28 }}>
        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <Ic d={I.clock} size={14} color={T.textDim} s />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Recent Activity</span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {recentActivity.map((a, i) => (
                <div key={i} onClick={() => navigate(`/envelope/${a.envId}`)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                    cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: `${activityColor(a.type)}10`,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic d={activityIcon(a.type)} size={13} color={activityColor(a.type)} s />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>{fd(a.time)} · {ft(a.time)}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Drafts */}
        {drafts.length > 0 && (
          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <Ic d={I.doc} size={14} color={T.textDim} s />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.text, textTransform: "uppercase", letterSpacing: 0.5 }}>Drafts</span>
              <span style={{ fontSize: 10, color: T.textDim }}>({drafts.length})</span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {drafts.map(env => (
                <div key={env.id} onClick={() => navigate(`/envelope/${env.id}`)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 20px",
                    cursor: "pointer", transition: "background 0.12s" }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    background: T.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Ic d={I.doc} size={13} color={T.textDim} s />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{env.name}</div>
                    <div style={{ fontSize: 10, color: T.textDim }}>{env.pages} page{env.pages > 1 ? "s" : ""} · {fd(env.createdAt)}</div>
                  </div>
                  <Btn size="sm" variant="secondary" onClick={e => { e.stopPropagation(); navigate(`/prepare/${env.id}`); }}>
                    Prepare
                  </Btn>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* All Documents table */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => setShowAll(!showAll)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none",
            cursor: "pointer", fontFamily: F.body, padding: 0 }}>
          <h2 style={{ fontFamily: F.body, fontSize: 14, fontWeight: 700, margin: 0, color: T.text,
            textTransform: "uppercase", letterSpacing: 0.5 }}>
            All Documents
          </h2>
          <span style={{ fontSize: 11, color: T.textDim }}>({envelopes.length})</span>
          <Ic d={showAll ? "M18 15l-6-6-6 6" : "M6 9l6 6 6-6"} size={14} color={T.textDim} s />
        </button>
      </div>

      {showAll && (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {["all", "draft", "sent", "in_progress", "completed"].map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  padding: "5px 12px", borderRadius: 6,
                  border: `1px solid ${filter === f ? T.accent : T.border}`,
                  background: filter === f ? T.accentSoft : "transparent",
                  color: filter === f ? T.accent : T.textSec,
                  fontSize: 12, fontWeight: 600, fontFamily: F.body, cursor: "pointer", textTransform: "capitalize",
                }}>{f === "all" ? "All" : f.replace("_", " ")}</button>
              ))}
            </div>
            <div style={{ flex: 1, minWidth: 180, maxWidth: 280 }}>
              <Input size="sm" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents..." />
            </div>
          </div>
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div className="sf-table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {["Document", "Status", "Signers", "Progress", "Updated", ""].map((h, i) => (
                    <th key={i} style={{ padding: "12px 16px", textAlign: "left", fontSize: 10, fontWeight: 700,
                      color: T.textDim, textTransform: "uppercase", letterSpacing: 0.8 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{filtered.map(env => {
                  const st = STATUS[env.status];
                  const signedCount = env.signers.filter(s => s.status === "signed").length;
                  const totalSigners = env.signers.length;
                  const progress = totalSigners > 0 ? (signedCount / totalSigners) * 100 : 0;
                  return (
                    <tr key={env.id} onClick={() => navigate(`/envelope/${env.id}`)}
                      style={{ borderBottom: `1px solid ${T.borderLight}`, cursor: "pointer", transition: "background 0.12s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{env.name}</div>
                        <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{env.pages} page{env.pages > 1 ? "s" : ""}</div>
                      </td>
                      <td style={{ padding: "14px 16px" }}><Badge color={st.color} bg={st.bg}>{st.label}</Badge></td>
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex" }}>
                          {env.signers.map((s, i) => (
                            <div key={s.id} title={`${s.name || "Signer"} — ${s.status}`} style={{
                              width: 26, height: 26, borderRadius: "50%",
                              background: s.status === "signed" ? T.success : s.status === "pending" ? T.warmSoft : T.surfaceAlt,
                              border: `2px solid ${T.surface}`, display: "flex", alignItems: "center", justifyContent: "center",
                              marginLeft: i > 0 ? -6 : 0, zIndex: env.signers.length - i,
                              fontSize: 10, fontWeight: 700,
                              color: s.status === "signed" ? T.white : s.status === "pending" ? T.warm : T.textDim,
                            }}>{s.status === "signed" ? <Ic d={I.check} size={10} color={T.white} s /> : (s.name || "?").charAt(0).toUpperCase()}</div>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px", width: 120 }}>
                        {totalSigners > 0 ? (
                          <div>
                            <div style={{ height: 4, borderRadius: 4, background: T.bgWarm, overflow: "hidden" }}>
                              <div style={{ height: "100%", borderRadius: 4, width: `${progress}%`,
                                background: progress === 100 ? T.success : T.accent, transition: "width 0.4s ease" }} />
                            </div>
                            <div style={{ fontSize: 10, color: T.textDim, marginTop: 3 }}>{signedCount}/{totalSigners} signed</div>
                          </div>
                        ) : <span style={{ fontSize: 11, color: T.textDim }}>—</span>}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: T.textSec }}>{fd(env.updatedAt)}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <button onClick={e => { e.stopPropagation(); setDeleteId(env.id); }}
                          title="Delete" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 4 }}>
                          <Ic d={I.trash} size={14} color={T.textDim} s />
                        </button>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {filtered.length === 0 && (
              <div style={{ padding: 48, textAlign: "center" }}>
                <p style={{ color: T.textDim, fontSize: 14 }}>{search ? "No documents match your search" : "No documents match this filter"}</p>
              </div>
            )}
          </Card>
        </>
      )}

      {/* Empty state when nothing exists */}
      {envelopes.length === 0 && (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: T.accentSoft,
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Ic d={I.doc} size={24} color={T.accent} s />
          </div>
          <h3 style={{ fontFamily: F.display, fontSize: 18, fontWeight: 600, margin: "0 0 8px" }}>No documents yet</h3>
          <p style={{ fontSize: 13, color: T.textSec, marginBottom: 20 }}>Create your first envelope to get started with electronic signing.</p>
          <Btn onClick={() => navigate("/new")}><Ic d={I.plus} size={15} color={T.white} s /> New Envelope</Btn>
        </Card>
      )}

      {/* Delete confirmation */}
      {envToDelete && (
        <div onClick={() => setDeleteId(null)} style={{
          position: "fixed", inset: 0, background: "rgba(44,42,37,0.4)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
          backdropFilter: "blur(4px)", animation: "fadeIn 0.2s ease",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: T.surface, borderRadius: 16, padding: 24, width: "100%", maxWidth: 360,
            boxShadow: T.shadowLg, textAlign: "center",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: T.errorSoft,
              display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
              <Ic d={I.trash} size={20} color={T.error} s />
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 8 }}>Delete Envelope?</div>
            <p style={{ fontSize: 13, color: T.textSec, marginBottom: 20, lineHeight: 1.5 }}>
              "{envToDelete.name}" will be permanently removed. This action cannot be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
              <Btn variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Btn>
              <Btn variant="danger" onClick={confirmDelete}><Ic d={I.trash} size={13} color={T.error} s /> Delete</Btn>
            </div>
          </div>
        </div>
      )}

      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>
    </PageContainer>
  );
}
