import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { T as LightT, F } from "./theme";
import { signingUrl, usePersistedState } from "./utils";
import { useAuth } from "./lib/AuthContext";
import * as db from "./lib/db";
import {
  Landing, Dashboard, Templates, NewEnvelope, Detail, Prepare, Sign, Notifications,
  Login, Signup, ForgotPassword, ResetPassword, Settings, TemplateNew,
} from "./pages";
import { AppShell } from "./components/app";
import { TemplateEditor } from "./components/editor/TemplateEditor";

const DARK = {
  bg: "#0F1A1F", bgWarm: "#162025", surface: "#1C2A30", surfaceAlt: "#233238",
  surfaceHover: "#2A3A42", border: "#344850", borderLight: "#2A3A42",
  borderFocus: "#00CCB8", accent: "#00CCB8", accentHover: "#00B5A3",
  accentSoft: "rgba(0,204,184,0.12)", accentText: "#33DDCC",
  warm: "#FCEB8A", warmSoft: "rgba(252,235,138,0.12)",
  success: "#5A9E68", successSoft: "rgba(90,158,104,0.12)",
  warning: "#D49B2A", warningSoft: "rgba(212,155,42,0.12)",
  error: "#D05A4B", errorSoft: "rgba(208,90,75,0.12)",
  purple: "#4B7EAE", purpleSoft: "rgba(75,126,174,0.12)",
  text: "#E4ECF0", textSec: "#9AABB8", textDim: "#6A7E8A",
  white: "#FFFFFF",
  shadow: "0 1px 3px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.15)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.2)",
  shadowLg: "0 10px 30px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)",
};

export const ThemeCtx = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

// Loading spinner
function LoadingScreen() {
  const T = LightT;
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: T.bg }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.accent}`,
          borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ fontSize: 13, color: T.textDim }}>Loading...</p>
      </div>
    </div>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [dark, setDark] = usePersistedState("sf_dark", false);
  const T = dark ? { ...LightT, ...DARK } : LightT;
  const toggle = useCallback(() => setDark(d => !d), [setDark]);

  // App data state
  const [envelopes, setEnvelopes] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [emails, setEmails] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [notif, setNotif] = useState(null);
  const notify = (msg, type = "success") => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 3000); };

  // Load data from Supabase when user logs in; clear cached state on sign-out.
  useEffect(() => {
    if (!user) {
      setEnvelopes([]);
      setTemplates([]);
      setEmails([]);
      setDataLoading(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const [envs, tmpls, emls] = await Promise.all([
          db.fetchEnvelopes(),
          db.fetchTemplates(user.id),
          db.fetchEmails(user.id),
        ]);
        if (cancelled) return;
        // Load signers and fields for each envelope
        const enriched = await Promise.all(
          envs.map(async (env) => {
            const full = await db.fetchEnvelopeWithDetails(env.id);
            return full;
          })
        );
        if (cancelled) return;
        setEnvelopes(enriched);
        setTemplates(tmpls.map(t => ({
          ...t, signerRoles: t.signer_roles, createdAt: t.created_at, usageCount: t.usage_count,
        })));
        setEmails(emls.map(e => ({
          id: e.id, envelopeId: e.envelope_id, envelopeName: "",
          to: e.to_email, toName: e.to_name, type: e.type, subject: e.subject,
          signingUrl: e.signing_url, status: e.status,
          sentAt: e.sent_at, deliveredAt: e.delivered_at, openedAt: e.opened_at,
        })));
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    setDataLoading(true);
    load();
    return () => { cancelled = true; };
  }, [user]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        navigate("/new");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const sendEmail = async (envelope, signer, type = "request") => {
    const url = signingUrl(signer.sign_token || envelope.id);
    const subject = type === "request" ? `Signature requested: ${envelope.name}`
      : type === "reminder" ? `Reminder: Please sign ${envelope.name}`
      : type === "completed" ? `Completed: ${envelope.name} — all signatures collected`
      : `Action needed: ${envelope.name}`;

    // Save to database
    let emailRecord;
    try {
      emailRecord = await db.createEmail(user.id, {
        envelopeId: envelope.id,
        to: signer.email,
        toName: signer.name || "Signer",
        type,
        subject,
        signingUrl: url,
      });
    } catch (err) {
      console.error("Failed to save email:", err);
      return;
    }

    // Add to local state
    const localEmail = {
      id: emailRecord.id, envelopeId: envelope.id, envelopeName: envelope.name,
      to: signer.email, toName: signer.name || "Signer",
      type, subject, signingUrl: url,
      status: "sending", sentAt: emailRecord.sent_at, deliveredAt: null, openedAt: null,
    };
    setEmails(p => [localEmail, ...p]);

    // Queue the email; the cron worker will drain the outbox and call Postmark.
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          envelopeId: envelope.id,
          signerId: signer.id,
          signToken: signer.sign_token,
          to: signer.email, toName: signer.name || "Signer",
          subject, signingUrl: url, envelopeName: envelope.name, type,
          hasAccessCode: !!(signer.access_code_hash || signer.has_access_code || signer.accessCode),
        }),
      });
      if (!res.ok) {
        await db.updateEmail(emailRecord.id, { status: "bounced" });
        setEmails(p => p.map(e => e.id === emailRecord.id ? { ...e, status: "bounced" } : e));
      }
      // status stays "sending" until the worker actually delivers.
    } catch (err) {
      console.error("Email queue error:", err);
      await db.updateEmail(emailRecord.id, { status: "bounced" });
      setEmails(p => p.map(e => e.id === emailRecord.id ? { ...e, status: "bounced" } : e));
    }
    return localEmail;
  };

  // Show loading while auth is resolving
  if (authLoading) return <LoadingScreen />;

  // Public routes (no auth required)
  const isPublicRoute = location.pathname.startsWith("/sign/") ||
    location.pathname === "/login" || location.pathname === "/signup" ||
    location.pathname === "/forgot-password" || location.pathname === "/reset-password";

  return (
    <ThemeCtx.Provider value={{ dark, toggle, T }}>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: F.body, color: T.text, transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&family=Montserrat:wght@400;500;600&family=Caveat:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* Toast */}
      {notif && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999,
        background: notif.type === "success" ? T.successSoft : T.warningSoft,
        color: notif.type === "success" ? T.success : T.warning,
        border: `1px solid ${notif.type === "success" ? T.success : T.warning}22`,
        borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600,
        boxShadow: T.shadowMd, animation: "slideIn 0.25s ease" }}>{notif.msg}</div>}
      {/* Routes */}
      <Routes>
        {/* Root: Landing for guests, Dashboard (in AppShell) for users */}
        <Route path="/" element={
          !user ? <Landing />
            : dataLoading ? <LoadingScreen />
            : <AppShell><Dashboard envelopes={envelopes} setEnvelopes={setEnvelopes} notify={notify} /></AppShell>
        } />
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route path="/signup" element={user ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/sign/:id" element={
          <Sign envelopes={envelopes} notify={notify} setEnvelopes={setEnvelopes} />
        } />
        {/* Protected routes */}
        {!user ? (
          <Route path="*" element={<Navigate to="/login" replace />} />
        ) : dataLoading ? (
          <Route path="*" element={<LoadingScreen />} />
        ) : (
          <>
            <Route path="/templates" element={
              <AppShell><Templates templates={templates} setTemplates={setTemplates} notify={notify} /></AppShell>
            } />
            <Route path="/templates/new" element={
              <AppShell><TemplateNew /></AppShell>
            } />
            <Route path="/templates/new/place" element={
              <TemplateEditor mode="create" templates={templates} setTemplates={setTemplates} notify={notify} />
            } />
            <Route path="/templates/:id/edit" element={
              <TemplateEditor mode="edit" templates={templates} setTemplates={setTemplates} notify={notify} />
            } />
            <Route path="/emails" element={
              <AppShell><Notifications emails={emails} /></AppShell>
            } />
            <Route path="/settings" element={
              <AppShell><Settings /></AppShell>
            } />
            <Route path="/new" element={
              <AppShell>
              <NewEnvelope templates={templates}
                onCreate={async (env) => {
                  try {
                    let pdfUrl = null;
                    let pdfHash = null;

                    if (env.template) {
                      // Template path: reuse the template's PDF + hash, no upload.
                      pdfUrl = env.template.pdf_url || null;
                      pdfHash = env.template.original_pdf_sha256 || null;
                    } else if (env.pdfFile) {
                      try {
                        const result = await db.uploadPdf(user.id, env.pdfFile);
                        pdfUrl = result.path;
                        pdfHash = result.sha256;
                      } catch (uploadErr) {
                        console.warn("PDF upload failed, continuing without:", uploadErr);
                      }
                    }

                    const created = await db.createEnvelope(user.id, {
                      name: env.name, pages: env.pages, routing: env.routing,
                      pdfUrl, original_pdf_sha256: pdfHash,
                      expires_at: env.expires_at || null,
                    });
                    // Create signers if any
                    let signers = [];
                    if (env.signers && env.signers.length > 0) {
                      signers = await db.createSigners(created.id, env.signers);
                    }

                    // If this envelope was created from a template, copy the
                    // template's field placements into the new envelope. The
                    // template stores fields with role_index; map that to the
                    // newly-created signer at the same sort_order (signer-type
                    // recipients only).
                    let createdFields = [];
                    if (env.template?.fields?.length > 0 && signers.length > 0) {
                      const signerOnly = signers.filter(s => (s.recipient_type || "signer") !== "cc")
                        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
                      const fieldsToInsert = env.template.fields.map(f => ({
                        signer_id: signerOnly[f.role_index]?.id || signerOnly[0]?.id || null,
                        type: f.type,
                        page: f.page ?? 0,
                        x: f.x, y: f.y, w: f.w, h: f.h,
                        value: null,
                      }));
                      try {
                        createdFields = await db.createFields(created.id, fieldsToInsert);
                      } catch (e) {
                        console.warn("Template field copy failed:", e);
                      }

                      // Bump the template's usage_count + last_used_at.
                      try {
                        const updated = await db.recordTemplateUse(env.template.id, env.template.usage_count);
                        setTemplates(prev => prev.map(t => t.id === env.template.id
                          ? { ...t, usage_count: updated.usage_count, usageCount: updated.usage_count, last_used_at: updated.last_used_at }
                          : t));
                      } catch (e) {
                        console.warn("Template usage increment failed:", e);
                      }
                    }

                    const enriched = {
                      ...created,
                      signers: signers.map((s, i) => ({ ...s, sort_order: i })),
                      fields: createdFields,
                      pdfPages: env.pdfPages || null,
                      templateFields: env.templateFields || null,
                    };
                    setEnvelopes(p => [enriched, ...p]);
                    notify(env.template ? `Envelope created from template "${env.template.name || ""}"` : "Envelope created");
                    navigate(`/prepare/${created.id}`);
                  } catch (err) {
                    console.error("Create envelope error:", err);
                    notify("Failed to create envelope", "warning");
                  }
                }} />
              </AppShell>
            } />
            <Route path="/envelope/:id" element={
              <Detail envelopes={envelopes} setEnvelopes={setEnvelopes} notify={notify} sendEmail={sendEmail} emails={emails} />
            } />
            <Route path="/prepare/:id" element={
              <Prepare envelopes={envelopes} notify={notify} setEnvelopes={setEnvelopes}
                setTemplates={setTemplates} sendEmail={sendEmail} user={user} />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <style>{`
        @keyframes slideIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: ${T.textDim}; }
        table tr:last-child { border-bottom: none !important; }
        @media (max-width: 640px) {
          .sf-nav { padding: 0 12px !important; }
          .sf-brand { display: none !important; }
          .sf-tab-label { display: none !important; }
          .sf-tabs button { padding: 7px 10px !important; }
          .sf-stat-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .sf-page { padding: 16px 12px !important; }
          .sf-page-header { flex-direction: column !important; gap: 12px !important; }
          .sf-table-wrap { font-size: 12px; }
        }
      `}</style>
    </div>
    </ThemeCtx.Provider>
  );
}

