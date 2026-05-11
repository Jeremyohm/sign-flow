import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext";
import { LogoMark } from "../ui";
import { Ic, I } from "../ui";
import { NotificationBell } from "../NotificationBell";

const C = {
  paper:     "#FAFAF7",
  paperWarm: "#F2F2EE",
  paperHover:"#EAEAE6",
  ink:       "#0F1418",
  muted:     "#5A6168",
  forest:    "#1E5128",
  forestDark:"#163E1F",
  forestSoft:"rgba(30, 81, 40, 0.08)",
  border:    "#E0E0DC",
};

const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS  = "'Inter', system-ui, sans-serif";

const NAV_ITEMS = [
  { id: "documents",     path: "/",              label: "Documents",     icon: I.doc   },
  { id: "templates",     path: "/templates",     label: "Templates",     icon: I.tmpl  },
  { id: "contacts",      path: "/contacts",      label: "Contacts",      icon: I.user  },
  { id: "reports",       path: "/reports",       label: "Reports",       icon: I.chart },
  { id: "notifications", path: "/notifications", label: "Notifications", icon: I.bell  },
  { id: "settings",      path: "/settings",      label: "Settings",      icon: I.lock  },
];

const SIDEBAR_WIDTH = 240;
const TOP_BAR_HEIGHT = 56;

export function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const activeId =
    location.pathname.startsWith("/templates")     ? "templates"     :
    location.pathname.startsWith("/contacts")      ? "contacts"      :
    location.pathname.startsWith("/reports")       ? "reports"       :
    location.pathname.startsWith("/notifications") ? "notifications" :
    location.pathname === "/settings"              ? "settings"      :
    "documents";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.paper,
        color: C.ink,
        fontFamily: FONT_SANS,
      }}
    >
      <style>{`
        @media (max-width: 880px) {
          .as-sidebar { transform: translateX(-100%); transition: transform 200ms ease; }
          .as-sidebar.is-open { transform: translateX(0); box-shadow: 4px 0 16px rgba(15, 20, 24, 0.06); }
          .as-content { margin-left: 0 !important; }
          .as-hamburger { display: inline-flex !important; }
          .as-scrim { display: block !important; }
        }
        .as-nav-item:hover { background: ${C.paperHover}; }
        .as-nav-item.is-active { background: ${C.forestSoft}; color: ${C.forest}; }
        .as-iconbtn:hover { background: ${C.paperHover}; }
        .as-newbtn:hover { background: ${C.forestDark}; }
        .as-newbtn:active { transform: translateY(1px); }
        .as-menuitem:hover { background: ${C.paperWarm}; }
      `}</style>

      {/* Top bar */}
      <header
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0,
          height: TOP_BAR_HEIGHT,
          background: C.paper,
          borderBottom: `1px solid ${C.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 20px",
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Hamburger (mobile only) */}
          <button
            type="button"
            className="as-hamburger as-iconbtn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
            style={{
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              padding: 8,
              borderRadius: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              transition: "background 150ms ease",
            }}
          >
            <Ic d="M3 6h18 M3 12h18 M3 18h18" size={18} color={C.ink} s />
          </button>

          {/* Brand */}
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <LogoMark size={26} color={C.forest} />
            <span
              style={{
                fontFamily: FONT_SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: C.forest,
                letterSpacing: "-0.01em",
              }}
            >
              Sign Flow
            </span>
          </button>
        </div>

        {/* Right side: notifications bell + account menu */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 4 }}>
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            className="as-iconbtn"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 6,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: FONT_SANS,
              fontSize: 13,
              color: C.muted,
              transition: "background 150ms ease",
            }}
          >
            <span style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.email || "Account"}
            </span>
            <Ic d="M6 9l6 6 6-6" size={14} color={C.muted} s />
          </button>

          {menuOpen && (
            <>
              {/* Click-out scrim */}
              <div
                onClick={() => setMenuOpen(false)}
                style={{ position: "fixed", inset: 0, zIndex: 60 }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  right: 0,
                  minWidth: 200,
                  background: C.paper,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  boxShadow: "0 4px 16px rgba(15, 20, 24, 0.08)",
                  padding: 4,
                  zIndex: 61,
                }}
              >
                <button
                  type="button"
                  className="as-menuitem"
                  onClick={() => { setMenuOpen(false); navigate("/settings"); }}
                  style={menuItemStyle()}
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="as-menuitem"
                  onClick={() => { setMenuOpen(false); handleSignOut(); }}
                  style={menuItemStyle()}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Mobile drawer scrim */}
      {drawerOpen && (
        <div
          className="as-scrim"
          onClick={() => setDrawerOpen(false)}
          style={{
            display: "none",
            position: "fixed",
            inset: `${TOP_BAR_HEIGHT}px 0 0 0`,
            background: "rgba(15, 20, 24, 0.3)",
            zIndex: 30,
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`as-sidebar ${drawerOpen ? "is-open" : ""}`}
        style={{
          position: "fixed",
          top: TOP_BAR_HEIGHT,
          left: 0,
          bottom: 0,
          width: SIDEBAR_WIDTH,
          background: C.paperWarm,
          borderRight: `1px solid ${C.border}`,
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          zIndex: 40,
        }}
      >
        {NAV_ITEMS.map(item => {
          const isActive = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => { setDrawerOpen(false); navigate(item.path); }}
              className={`as-nav-item ${isActive ? "is-active" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 6,
                background: "transparent",
                border: "none",
                cursor: "pointer",
                fontFamily: FONT_SANS,
                fontSize: 14,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? C.forest : C.ink,
                textAlign: "left",
                transition: "background 150ms ease, color 150ms ease",
              }}
            >
              <Ic d={item.icon} size={16} color="currentColor" s />
              {item.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        {/* Persistent New envelope CTA at the bottom */}
        <button
          type="button"
          onClick={() => { setDrawerOpen(false); navigate("/new"); }}
          className="as-newbtn"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 6,
            background: C.forest,
            color: C.paper,
            border: "none",
            cursor: "pointer",
            fontFamily: FONT_SANS,
            fontSize: 14,
            fontWeight: 600,
            letterSpacing: "0.01em",
            transition: "background 150ms ease, transform 80ms ease",
          }}
        >
          <Ic d="M12 5v14 M5 12h14" size={14} color="currentColor" s />
          New envelope
        </button>
      </aside>

      {/* Main content */}
      <main
        className="as-content"
        style={{
          paddingTop: TOP_BAR_HEIGHT + 32,
          paddingBottom: 64,
          marginLeft: SIDEBAR_WIDTH,
          minHeight: "100vh",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            padding: "0 32px",
            boxSizing: "border-box",
          }}
        >
          {children}
        </div>
      </main>
    </div>
  );
}

function menuItemStyle() {
  return {
    display: "block",
    width: "100%",
    padding: "8px 12px",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontFamily: FONT_SANS,
    fontSize: 13,
    color: C.ink,
    textAlign: "left",
    borderRadius: 4,
    transition: "background 150ms ease",
  };
}
