import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDocTitle } from "../utils";
import * as db from "../lib/db";
import { TimeRangeSelector } from "../components/TimeRangeSelector";
import { StatCard, trendFrom, trendFromInverted, formatDuration } from "../components/StatCard";
import { VolumeChart } from "../components/VolumeChart";
import { StatusDonut } from "../components/StatusDonut";
import { TopRecipientsList } from "../components/TopRecipientsList";

const C = {
  paper: "#FAFAF7", paperWarm: "#F2F2EE", border: "#E0E0DC",
  ink: "#0F1418", muted: "#5A6168", forest: "#1E5128", forestSoft: "rgba(30,81,40,0.08)",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

function rangeLabel(rangeDays) {
  if (rangeDays === null) return "all time";
  if (rangeDays === 7) return "last 7 days";
  if (rangeDays === 30) return "last 30 days";
  if (rangeDays === 90) return "last 90 days";
  if (rangeDays === 365) return "last 12 months";
  return `last ${rangeDays} days`;
}

export function Reports() {
  useDocTitle("Reports");
  const navigate = useNavigate();
  const [rangeDays, setRangeDays] = useState(30);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const r = await db.fetchReports(rangeDays);
        if (!cancelled) setReport(r);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load reports");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [rangeDays]);

  const header = (
    <header style={{ display: "flex", alignItems: "flex-start",
      justifyContent: "space-between", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
      <div>
        <h1 style={{ fontFamily: FONT_SERIF, fontSize: 30, fontWeight: 600,
          margin: "0 0 4px", color: C.ink, letterSpacing: "-0.01em" }}>Reports</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: 0 }}>
          Insights into your signing activity
        </p>
      </div>
      <TimeRangeSelector value={rangeDays} onChange={setRangeDays} />
    </header>
  );

  if (loading && !report) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px",
        fontFamily: FONT_SANS, color: C.ink }}>
        {header}
        <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px",
        fontFamily: FONT_SANS, color: C.ink }}>
        {header}
        <div style={{ padding: 16, background: "#FCEBEB", border: "1px solid #F0B5B5",
          borderRadius: 10, color: "#A32D2D" }}>{error}</div>
      </div>
    );
  }

  if (report && report.total_ever === 0) {
    return (
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px",
        fontFamily: FONT_SANS, color: C.ink }}>
        {header}
        <EmptyState onSend={() => navigate("/new")} />
      </div>
    );
  }

  const s = report?.stats || {};
  const completionRate = s.sent_count > 0 ? (s.completed_count / s.sent_count) * 100 : 0;
  const prevCompletionRate = s.prev_sent_count > 0 ? (s.prev_completed_count / s.prev_sent_count) * 100 : null;
  const showTrend = rangeDays !== null && (s.prev_sent_count || 0) > 0;

  const noActivity = (s.sent_count || 0) === 0;

  return (
    <div style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px",
      fontFamily: FONT_SANS, color: C.ink }}>
      {header}

      {noActivity && rangeDays !== null && (
        <div style={{ marginBottom: 20, padding: "14px 18px",
          background: C.forestSoft, border: `1px solid ${C.border}`, borderRadius: 10,
          fontSize: 13, color: C.ink, display: "flex", alignItems: "center", gap: 12 }}>
          <span>No envelopes in the {rangeLabel(rangeDays)}.</span>
          <Link to="/new" style={{ color: C.forest, fontWeight: 600, textDecoration: "none" }}>
            Send your first envelope →
          </Link>
        </div>
      )}

      <div style={{ display: "grid", gap: 12, marginBottom: 20,
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <StatCard label="Envelopes sent" value={s.sent_count || 0}
          trend={showTrend ? trendFrom(s.sent_count, s.prev_sent_count) : null} />
        <StatCard label="Completed" value={s.completed_count || 0}
          trend={showTrend ? trendFrom(s.completed_count, s.prev_completed_count) : null} />
        <StatCard label="Completion rate" value={`${completionRate.toFixed(0)}%`}
          trend={showTrend && prevCompletionRate !== null
            ? trendFrom(completionRate, prevCompletionRate) : null} />
        <StatCard label="Avg. time to sign" value={formatDuration(s.avg_seconds)}
          trend={showTrend ? trendFromInverted(s.avg_seconds, s.prev_avg_seconds) : null} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <VolumeChart data={report.volume} bucket={report.bucket} />
      </div>

      <div className="reports-twocol" style={{ display: "grid", gap: 20,
        gridTemplateColumns: "1fr 1fr" }}>
        <StatusDonut data={report.status_breakdown} />
        <TopRecipientsList recipients={report.top_recipients} />
      </div>

      <style>{`@media (max-width: 880px) { .reports-twocol { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function EmptyState({ onSend }) {
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", background: "#fff",
      border: `1px solid ${C.border}`, borderRadius: 12 }}>
      <div style={{ width: 72, height: 72, borderRadius: "50%", background: C.forestSoft,
        margin: "0 auto 20px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
          stroke={C.forest} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3v18h18" />
          <path d="M7 16V8" /><path d="M12 16V4" /><path d="M17 16v-6" />
        </svg>
      </div>
      <h2 style={{ fontFamily: FONT_SERIF, fontSize: 22, fontWeight: 600, color: C.ink,
        margin: "0 0 8px" }}>No data yet</h2>
      <p style={{ fontSize: 14, color: C.muted, margin: "0 0 24px", maxWidth: 380,
        marginLeft: "auto", marginRight: "auto", lineHeight: 1.5 }}>
        Send envelopes to start building your reports.
      </p>
      <button onClick={onSend} style={{
        background: C.forest, color: "#fff", border: "none",
        padding: "10px 20px", borderRadius: 10, fontFamily: FONT_SANS,
        fontSize: 14, fontWeight: 600, cursor: "pointer",
      }}>+ New envelope</button>
    </div>
  );
}
