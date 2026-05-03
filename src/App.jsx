import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { T as LightT, F } from "./theme";
import { signingUrl, usePersistedState } from "./utils";
import { Ic, I } from "./components/ui";
import { useAuth } from "./lib/AuthContext";
import * as db from "./lib/db";
import {
  Dashboard, Templates, NewEnvelope, Detail, Prepare, Sign, Notifications,
  Login, Signup, ForgotPassword, ResetPassword,
} from "./pages";
// VA Benefits removed from TLT version (personal only)

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
  white: "#FFFFFF", ink: "#E4ECF0",
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
  const { user, loading: authLoading, signOut } = useAuth();
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

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (!user) { setDataLoading(false); return; }
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

    // Actually send via Postmark
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: signer.email, toName: signer.name || "Signer",
          subject, signingUrl: url, envelopeName: envelope.name, type,
          hasAccessCode: !!(signer.access_code || signer.accessCode),
        }),
      });
      if (res.ok) {
        await db.updateEmail(emailRecord.id, { status: "delivered", delivered_at: new Date().toISOString() });
        setEmails(p => p.map(e => e.id === emailRecord.id ? { ...e, status: "delivered", deliveredAt: new Date().toISOString() } : e));
      } else {
        await db.updateEmail(emailRecord.id, { status: "bounced" });
        setEmails(p => p.map(e => e.id === emailRecord.id ? { ...e, status: "bounced" } : e));
      }
    } catch (err) {
      console.error("Email send error:", err);
      await db.updateEmail(emailRecord.id, { status: "bounced" });
      setEmails(p => p.map(e => e.id === emailRecord.id ? { ...e, status: "bounced" } : e));
    }
    return localEmail;
  };

  const handleSignOut = async () => {
    await signOut();
    setEnvelopes([]);
    setTemplates([]);
    setEmails([]);
    navigate("/login");
  };

  // Show loading while auth is resolving
  if (authLoading) return <LoadingScreen />;

  // Public routes (no auth required)
  const isPublicRoute = location.pathname.startsWith("/sign/") ||
    location.pathname === "/login" || location.pathname === "/signup" ||
    location.pathname === "/forgot-password" || location.pathname === "/reset-password";

  const activeTab = location.pathname === "/templates" ? "templates"
    : location.pathname === "/emails" ? "emails"
    : "documents";

  return (
    <ThemeCtx.Provider value={{ dark, toggle, T }}>
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: F.body, color: T.text, transition: "background 0.3s, color 0.3s" }}>
      <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&family=Montserrat:wght@400;500;600&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet" />
      {/* Toast */}
      {notif && <div style={{ position: "fixed", top: 16, right: 16, zIndex: 999,
        background: notif.type === "success" ? T.successSoft : T.warningSoft,
        color: notif.type === "success" ? T.success : T.warning,
        border: `1px solid ${notif.type === "success" ? T.success : T.warning}22`,
        borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 600,
        boxShadow: T.shadowMd, animation: "slideIn 0.25s ease" }}>{notif.msg}</div>}
      {/* Nav — only show when logged in and not on public routes */}
      {user && !isPublicRoute && (
        <nav className="sf-nav" style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: "0 24px",
          display: "flex", alignItems: "center", height: 56, justifyContent: "space-between", boxShadow: T.shadow }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: T.accentSoft,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d={I.shield} size={16} color={T.accent} s />
            </div>
            <span className="sf-brand" style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: -0.3 }}>Legacy Sign</span>
          </div>
          <div className="sf-tabs" style={{ display: "flex", gap: 2 }}>
            {[{ id: "documents", path: "/", label: "Documents", icon: I.doc }, { id: "templates", path: "/templates", label: "Templates", icon: I.tmpl }, { id: "emails", path: "/emails", label: "Emails", icon: I.mail }].map(tab => (
              <button key={tab.id} onClick={() => navigate(tab.path)} style={{
                padding: "7px 14px", borderRadius: 7, border: "none", display: "flex", alignItems: "center", gap: 6,
                background: activeTab === tab.id ? T.accentSoft : "transparent",
                color: activeTab === tab.id ? T.accent : T.textSec,
                fontSize: 13, fontWeight: 600, fontFamily: F.body, cursor: "pointer", transition: "all 0.15s",
                position: "relative",
              }}>
                <Ic d={tab.icon} size={14} color="currentColor" s />
                <span className="sf-tab-label">{tab.label}</span>
                {tab.id === "emails" && emails.filter(e => e.status === "sending").length > 0 && (
                  <span style={{ position: "absolute", top: 2, right: 2, width: 7, height: 7, borderRadius: "50%", background: T.warm }} />
                )}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: T.textDim, marginRight: 8 }}>{user.email}</span>
            <button onClick={toggle} title={dark ? "Light mode" : "Dark mode"}
              style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d={dark ? "M12 3a9 9 0 109 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 01-4.4 2.26 5.4 5.4 0 01-3.14-9.8A9.06 9.06 0 0012 3z" : "M12 2a1 1 0 011 1v1a1 1 0 01-2 0V3a1 1 0 011-1zm0 15a5 5 0 100-10 5 5 0 000 10zm9-4h1a1 1 0 010 2h-1a1 1 0 010-2zM3 11h-1a1 1 0 010 2h1a1 1 0 010-2zm16.07-7.07a1 1 0 010 1.42l-.7.7a1 1 0 01-1.42-1.42l.7-.7a1 1 0 011.42 0zM6.05 17.66a1 1 0 010 1.41l-.7.71a1 1 0 01-1.42-1.42l.71-.7a1 1 0 011.41 0zm12.02.71a1 1 0 01-1.41 0l-.71-.71a1 1 0 011.42-1.41l.7.7a1 1 0 010 1.42zM4.93 6.05a1 1 0 01-1.42 0l-.7-.71a1 1 0 011.41-1.41l.71.7a1 1 0 010 1.42zM12 19a1 1 0 011 1v1a1 1 0 01-2 0v-1a1 1 0 011-1z"} size={16} color={T.textDim} s />
            </button>
            <button onClick={handleSignOut} title="Sign out"
              style={{ padding: 6, borderRadius: 6, border: "none", background: "transparent",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ic d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9" size={16} color={T.textDim} s />
            </button>
          </div>
        </nav>
      )}
      {/* Routes */}
      <Routes>
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
            <Route path="/" element={
              <Dashboard envelopes={envelopes} setEnvelopes={setEnvelopes} notify={notify} />
            } />
            <Route path="/templates" element={
              <Templates templates={templates} setTemplates={setTemplates} notify={notify} />
            } />
            <Route path="/emails" element={
              <Notifications emails={emails} />
            } />
            <Route path="/new" element={
              <NewEnvelope templates={templates}
                onCreate={async (env) => {
                  try {
                    // Upload PDF to Supabase Storage if present
                    let pdfUrl = null;
                    if (env.pdfFile) {
                      try {
                        const path = await db.uploadPdf(user.id, env.pdfFile);
                        pdfUrl = path;
                      } catch (uploadErr) {
                        console.warn("PDF upload failed, continuing without:", uploadErr);
                      }
                    }
                    const created = await db.createEnvelope(user.id, {
                      name: env.name, pages: env.pages, routing: env.routing, pdfUrl,
                    });
                    // Create signers if any
                    let signers = [];
                    if (env.signers && env.signers.length > 0) {
                      signers = await db.createSigners(created.id, env.signers);
                    }
                    const enriched = {
                      ...created,
                      signers: signers.map((s, i) => ({ ...s, sort_order: i })),
                      fields: [],
                      pdfPages: env.pdfPages || null,
                      templateFields: env.templateFields || null,
                    };
                    setEnvelopes(p => [enriched, ...p]);
                    notify("Envelope created");
                    navigate(`/prepare/${created.id}`);
                  } catch (err) {
                    console.error("Create envelope error:", err);
                    notify("Failed to create envelope", "warning");
                  }
                }} />
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
