import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useDocTitle } from "../utils";
import { LogoMark } from "../components/ui";
import { DocumentRow, Zone } from "../components/app";
import * as db from "../lib/db";
import { useTierLimits } from "../lib/useTierLimits";

const C = {
  ink:       "#0F1418",
  muted:     "#5A6168",
  soft:      "#8A8A82",
  forest:    "#1E5128",
  forestDark:"#163E1F",
  paperWarm: "#F2F2EE",
  border:    "#E0E0DC",
};

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

// "Time ago" — minimal humanizer for ISO timestamps
function timeAgo(iso) {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  if (isNaN(ms)) return "";
  const secs = Math.max(0, Math.floor(ms / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function greetingPrefix() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function deriveFirstName(user) {
  const meta = user?.user_metadata || {};
  if (meta.first_name) return meta.first_name;
  if (meta.full_name) return String(meta.full_name).split(" ")[0];
  return null;
}

export function Dashboard({ envelopes = [], notify }) {
  useDocTitle("Documents");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFree } = useTierLimits();

  const userEmail = user?.email?.toLowerCase() || "";
  const firstName = deriveFirstName(user);

  const buckets = useMemo(() => {
    // Awaiting you: envelopes where the current user is a signer who hasn't signed
    const awaitingYou = envelopes.filter(e => {
      if (e.status === "completed" || e.status === "draft" || e.status === "declined") return false;
      const me = (e.signers || []).find(s => (s.email || "").toLowerCase() === userEmail);
      return me && me.status !== "signed";
    });

    const drafts = envelopes.filter(e => e.status === "draft");

    const awaitingOthers = envelopes.filter(e => {
      if (e.status !== "sent" && e.status !== "in_progress") return false;
      // Exclude ones already counted in "awaiting you"
      return !awaitingYou.includes(e);
    });

    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentlyCompleted = envelopes
      .filter(e => {
        if (e.status !== "completed") return false;
        const t = new Date(e.updated_at || e.updatedAt || e.created_at || e.createdAt).getTime();
        return !isNaN(t) && t >= thirtyDaysAgo;
      })
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.updatedAt || 0).getTime();
        const tb = new Date(b.updated_at || b.updatedAt || 0).getTime();
        return tb - ta;
      })
      .slice(0, 5);

    return { awaitingYou, awaitingOthers, recentlyCompleted, drafts };
  }, [envelopes, userEmail]);

  // Empty state — never created an envelope
  if (envelopes.length === 0) {
    return <EmptyState navigate={navigate} />;
  }

  // Status sub-line
  const subline = buildSubline(buckets);

  // Stats strip — only if user has 5+ envelopes
  const showStats = envelopes.length >= 5;
  const stats = showStats ? computeStats(envelopes) : null;

  const handleSignedDownload = async (env) => {
    try {
      const url = await db.fetchSignedDocumentUrl(env.id);
      window.location.href = url;
    } catch (err) {
      if (err.status === 425) notify?.("Document still being generated", "warning");
      else notify?.("Download failed", "warning");
    }
  };

  return (
    <div style={{ fontFamily: FONT_SANS }}>
      {/* 1. Greeting + primary action bar */}
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 40,
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontFamily: FONT_SERIF,
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: C.ink,
              margin: "0 0 6px",
              lineHeight: 1.1,
            }}
          >
            {firstName ? `${greetingPrefix()}, ${firstName}.` : "Welcome back."}
          </h1>
          <p style={{ fontSize: 15, color: C.muted, margin: 0, lineHeight: 1.5 }}>
            {subline}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/new")}
          className="db-newbtn"
          style={{
            padding: "11px 18px",
            background: C.forest,
            color: "#FAFAF7",
            border: "none",
            borderRadius: 6,
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
            transition: "background 150ms ease, transform 80ms ease",
            flexShrink: 0,
          }}
        >
          New envelope
        </button>
      </header>

      <style>{`
        .db-newbtn:hover { background: ${C.forestDark}; transform: translateY(-1px); }
        .db-newbtn:active { transform: translateY(0); }
        .lp-doc-row:hover { background: ${C.paperWarm}; }
        .lp-doc-row:hover .lp-doc-row-action { transform: translateX(3px); }
        .db-link:hover { text-decoration: underline; }
      `}</style>

      {/* 2. Stats strip — only ≥5 envelopes */}
      {showStats && stats && (
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 32,
            paddingBottom: 32,
            marginBottom: 40,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <Stat label="This month" value={`${stats.thisMonth} ${stats.thisMonth === 1 ? "envelope" : "envelopes"}`} />
          <Stat label="Awaiting signers" value={String(stats.awaitingSigners)} />
          <Stat label="Completion rate" value={`${stats.completionRate}%`} />
        </section>
      )}

      {/* 3a. Awaiting you */}
      {buckets.awaitingYou.length > 0 && (
        <Zone title="Awaiting you" count={buckets.awaitingYou.length}>
          {buckets.awaitingYou.map((e, i, arr) => (
            <DocumentRow
              key={e.id}
              status="green"
              name={e.name}
              subline={`Sent · ${timeAgo(e.updated_at || e.updatedAt || e.created_at || e.createdAt)}`}
              actionLabel="Sign now →"
              onClick={() => navigate(`/sign/${(e.signers || []).find(s => (s.email || "").toLowerCase() === userEmail)?.sign_token || e.id}`)}
              isLast={i === arr.length - 1}
            />
          ))}
        </Zone>
      )}

      {/* 3b. Awaiting others */}
      <Zone title="Awaiting others" count={buckets.awaitingOthers.length}>
        {buckets.awaitingOthers.length === 0 ? (
          <EmptyZoneLine>No envelopes out for signature.</EmptyZoneLine>
        ) : (
          buckets.awaitingOthers.map((e, i, arr) => {
            const signers = e.signers || [];
            const signed = signers.filter(s => s.status === "signed").length;
            const total = signers.length || 0;
            return (
              <DocumentRow
                key={e.id}
                status="amber"
                name={e.name}
                subline={`Sent ${timeAgo(e.updated_at || e.updatedAt || e.created_at || e.createdAt)} · ${signed} of ${total} signed`}
                actionLabel="View →"
                onClick={() => navigate(`/envelope/${e.id}`)}
                isLast={i === arr.length - 1}
              />
            );
          })
        )}
      </Zone>

      {/* 3c. Recently completed (last 30 days, max 5) */}
      {buckets.recentlyCompleted.length > 0 && (
        <Zone
          title="Recently completed"
          footer={
            envelopes.filter(e => e.status === "completed").length > 5 ? (
              <a
                href="#"
                onClick={(ev) => { ev.preventDefault(); navigate("/"); }}
                className="db-link"
                style={{ fontSize: 13, color: C.forest, textDecoration: "none", fontWeight: 600 }}
              >
                View all completed →
              </a>
            ) : null
          }
        >
          {buckets.recentlyCompleted.map((e, i, arr) => {
            const signerCount = (e.signers || []).length;
            return (
              <DocumentRow
                key={e.id}
                status="green"
                name={e.name}
                subline={`Completed ${formatDate(e.updated_at || e.updatedAt)} · ${signerCount} ${signerCount === 1 ? "signer" : "signers"}`}
                actionLabel="Download →"
                onClick={() => handleSignedDownload(e)}
                isLast={i === arr.length - 1}
              />
            );
          })}
        </Zone>
      )}

      {/* 4. Drafts */}
      {buckets.drafts.length > 0 && (
        <Zone title="Drafts" count={buckets.drafts.length}>
          {buckets.drafts.map((e, i, arr) => (
            <DocumentRow
              key={e.id}
              status="gray"
              name={e.name || "Untitled draft"}
              subline={`Created ${timeAgo(e.created_at || e.createdAt)}`}
              actionLabel="Continue →"
              onClick={() => navigate(`/prepare/${e.id}`)}
              isLast={i === arr.length - 1}
            />
          ))}
        </Zone>
      )}

      {isFree && envelopes.some(e => {
        const t = new Date(e.updated_at || e.updatedAt || e.created_at || e.createdAt).getTime();
        return !isNaN(t) && t < Date.now() - 30 * 24 * 60 * 60 * 1000;
      }) && (
        <div style={{ marginTop: 32, padding: "12px 16px",
          background: "rgba(196,132,29,0.06)", border: "1px solid rgba(196,132,29,0.25)",
          borderRadius: 10, fontSize: 13, color: C.ink,
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span>Older envelopes are hidden after 30 days on the Free plan.</span>
          <a href="/pricing" style={{ color: C.forest, fontWeight: 600, textDecoration: "none" }}>
            Upgrade for full history →
          </a>
        </div>
      )}

      {/* 5. Footer link */}
      <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${C.border}` }}>
        <a
          href="#"
          onClick={(ev) => { ev.preventDefault(); /* no separate listing page yet */ }}
          className="db-link"
          style={{
            fontSize: 13,
            color: C.muted,
            textDecoration: "none",
            fontWeight: 500,
          }}
          aria-disabled="true"
          title="Full document list — coming soon"
        >
          View all documents →
        </a>
      </div>
    </div>
  );
}

// ───────────────── Helpers + subcomponents ─────────────────

function buildSubline({ awaitingYou, awaitingOthers }) {
  const others = awaitingOthers.length;
  const you = awaitingYou.length;
  if (others === 0 && you === 0) return "All caught up — nothing needs your attention.";
  if (you > 0 && others > 0) {
    return `${others} ${others === 1 ? "envelope" : "envelopes"} awaiting signers · ${you} awaiting you`;
  }
  if (you > 0) return `${you} ${you === 1 ? "envelope" : "envelopes"} awaiting you.`;
  return `${others} ${others === 1 ? "envelope" : "envelopes"} awaiting signers.`;
}

function computeStats(envelopes) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const thisMonth = envelopes.filter(e => {
    const t = new Date(e.created_at || e.createdAt || 0).getTime();
    return !isNaN(t) && t >= monthStart;
  }).length;

  const awaitingSigners = envelopes.filter(
    e => e.status === "sent" || e.status === "in_progress",
  ).length;

  const closed = envelopes.filter(e => e.status === "completed" || e.status === "declined").length;
  const completedCount = envelopes.filter(e => e.status === "completed").length;
  const completionRate = closed > 0 ? Math.round((completedCount / closed) * 100) : 0;

  return { thisMonth, awaitingSigners, completionRate };
}

function Stat({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT_SANS,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: C.muted,
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 22,
          fontWeight: 600,
          color: C.ink,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function EmptyZoneLine({ children }) {
  return (
    <div
      style={{
        padding: "14px 12px",
        fontSize: 13,
        color: C.soft,
        fontStyle: "italic",
      }}
    >
      {children}
    </div>
  );
}

function EmptyState({ navigate }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        minHeight: "60vh",
        padding: "40px 24px",
        fontFamily: FONT_SANS,
      }}
    >
      <div style={{ marginBottom: 24, opacity: 0.45 }}>
        <LogoMark size={64} color={C.forest} />
      </div>
      <h1
        style={{
          fontFamily: FONT_SERIF,
          fontSize: 36,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: C.ink,
          margin: "0 0 12px",
          lineHeight: 1.1,
        }}
      >
        Send your first envelope.
      </h1>
      <p
        style={{
          fontSize: 16,
          color: C.muted,
          lineHeight: 1.55,
          maxWidth: 520,
          margin: "0 0 28px",
        }}
      >
        Upload a PDF, add signers, and send. The signed copy and audit trail come back automatically.
      </p>
      <button
        type="button"
        onClick={() => navigate("/new")}
        className="db-newbtn"
        style={{
          padding: "13px 26px",
          background: C.forest,
          color: "#FAFAF7",
          border: "none",
          borderRadius: 6,
          fontFamily: FONT_SANS,
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: "0.01em",
          transition: "background 150ms ease, transform 80ms ease",
          marginBottom: 16,
        }}
      >
        New envelope
      </button>
      <a
        href="#"
        onClick={(ev) => { ev.preventDefault(); navigate("/templates"); }}
        style={{
          fontSize: 13,
          color: C.forest,
          fontWeight: 500,
          textDecoration: "none",
        }}
      >
        Or start from a template
      </a>
      <style>{`
        .db-newbtn:hover { background: ${C.forestDark}; transform: translateY(-1px); }
        .db-newbtn:active { transform: translateY(0); }
      `}</style>
    </div>
  );
}
