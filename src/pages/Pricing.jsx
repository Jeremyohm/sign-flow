import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import { useDocTitle } from "../utils";
import { LogoMark } from "../components/ui";

const C = {
  paper: "#FAFAF7", paperDark: "#F2F2EE", paperHover: "#EAEAE6",
  ink: "#0F1418", muted: "#5A6168",
  forest: "#1E5128", forestDark: "#163E1F", forestSoft: "rgba(30,81,40,0.08)",
  border: "#E0E0DC",
};
const FONT_SERIF = "'Fraunces', Georgia, serif";
const FONT_SANS = "'Inter', system-ui, sans-serif";

const TIERS = [
  {
    id: "free", name: "Free", tagline: "For trying out Sign Flow",
    price: 0, ctaLabel: "Start free", ctaVariant: "secondary",
    features: [
      "3 envelopes per month",
      "Up to 2 recipients per envelope",
      "2 saved templates",
      "30-day envelope history",
      "Sign Flow branding on documents",
      "ESIGN/UETA compliant",
    ],
  },
  {
    id: "pro", name: "Pro", tagline: "For solo professionals",
    price: 15, ctaLabel: "Get Pro", ctaVariant: "primary", popular: true,
    features: [
      "Unlimited envelopes",
      "Unlimited recipients",
      "Unlimited saved templates",
      "Full envelope history",
      "No Sign Flow branding",
      "Custom email reply-to",
      "Basic API access",
      "Email support",
    ],
  },
  {
    id: "business", name: "Business", tagline: "For teams and high-volume senders",
    price: 39, ctaLabel: "Get Business", ctaVariant: "secondary",
    features: [
      "Everything in Pro, plus:",
      "Multi-user accounts",
      "Custom branding on documents",
      "Advanced reports & exports",
      "Full API access + webhooks",
      "Priority support",
    ],
  },
];

const FAQ = [
  { q: "Can I upgrade or downgrade later?",
    a: "Yes — change your plan anytime from Settings → Billing." },
  { q: "What happens if I exceed the 3 envelopes on Free?",
    a: "You can upgrade to Pro for unlimited envelopes, or wait until next month when your free quota resets." },
  { q: "Do you offer annual billing?",
    a: "Not yet — monthly billing only for now. Annual options are on the roadmap." },
  { q: "Is my data secure?",
    a: "Documents are encrypted in transit and at rest. Every envelope has a tamper-evident audit trail." },
  { q: "Can I cancel anytime?",
    a: "Yes. Cancel from Settings → Billing. You'll keep access until the end of your billing period." },
  { q: "Do signed documents hold up in court?",
    a: "Yes. Sign Flow signatures meet the ESIGN Act and UETA standards. Every signed document includes a tamper-evident audit trail and certificate of completion." },
  { q: "What if my recipient doesn't have a Sign Flow account?",
    a: "They don't need one. Anyone with the email link can sign — no account required on their end." },
];

function ctaTarget(tierId, isAuthed) {
  if (tierId === "free") return isAuthed ? "/" : "/signup";
  if (isAuthed) return `/settings?tab=billing&action=upgrade-${tierId}`;
  return `/signup?intent=${tierId}`;
}

export function Pricing() {
  useDocTitle("Pricing — Sign Flow");
  const { user } = useAuth();
  const isAuthed = !!user;

  return (
    <div style={{ background: C.paper, color: C.ink, fontFamily: FONT_SANS, minHeight: "100vh" }}>
      <PageStyles />
      <PricingNav isAuthed={isAuthed} />

      {/* Hero */}
      <section style={{ padding: "72px 24px 32px", textAlign: "center" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontSize: 12, color: C.muted, letterSpacing: 2,
            textTransform: "uppercase", fontWeight: 600, marginBottom: 14 }}>
            Pricing
          </div>
          <h1 style={{ fontFamily: FONT_SERIF, fontSize: 52, fontWeight: 600,
            lineHeight: 1.05, margin: "0 0 16px", color: C.ink,
            letterSpacing: "-0.02em" }}>
            Simple pricing. Real value.
          </h1>
          <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.5, margin: "0 0 12px" }}>
            Start free. Upgrade when you need more. No surprises.
          </p>
          <p style={{ fontSize: 13, color: C.muted, margin: 0 }}>
            All plans include legally-binding signatures under ESIGN and UETA.
          </p>
        </div>
      </section>

      {/* Pricing cards */}
      <section style={{ padding: "32px 24px 56px" }}>
        <div className="pricing-grid" style={{ maxWidth: 1100, margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20,
          alignItems: "stretch" }}>
          {TIERS.map(t => (
            <PricingCard key={t.id} tier={t} isAuthed={isAuthed} />
          ))}
        </div>
      </section>

      {/* Trust strip */}
      <TrustStrip />

      {/* FAQ */}
      <section style={{ padding: "56px 24px", background: C.paper }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontFamily: FONT_SERIF, fontSize: 32, fontWeight: 600,
            textAlign: "center", margin: "0 0 32px", color: C.ink,
            letterSpacing: "-0.01em" }}>
            Frequently asked questions
          </h2>
          <div>
            {FAQ.map((item, i) => (
              <details key={i} className="faq-item">
                <summary className="faq-summary">
                  <span>{item.q}</span>
                  <span className="faq-chevron" aria-hidden="true">›</span>
                </summary>
                <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.6,
                  margin: "8px 0 18px" }}>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <FinalCTA isAuthed={isAuthed} />
    </div>
  );
}

function PricingNav({ isAuthed }) {
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 50,
      background: C.paper, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center",
          gap: 10, textDecoration: "none", color: C.forest }}>
          <LogoMark size={26} color={C.forest} />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 18, fontWeight: 600,
            letterSpacing: "-0.01em" }}>Sign Flow</span>
        </Link>
        <nav style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Link to="/pricing" style={{ color: C.forest, fontSize: 14,
            fontWeight: 600, textDecoration: "none" }}>Pricing</Link>
          {isAuthed ? (
            <Link to="/" style={{ background: C.forest, color: "#fff",
              padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              textDecoration: "none" }}>Dashboard</Link>
          ) : (
            <>
              <Link to="/login" style={{ color: C.muted, fontSize: 14,
                fontWeight: 500, textDecoration: "none" }}>Sign in</Link>
              <Link to="/signup" style={{ background: C.forest, color: "#fff",
                padding: "8px 18px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                textDecoration: "none" }}>Start free</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function PricingCard({ tier, isAuthed }) {
  const navigate = useNavigate();
  const target = ctaTarget(tier.id, isAuthed);
  const isPro = tier.id === "pro";

  return (
    <div className={`pricing-card${isPro ? " pricing-card--popular" : ""}`}
      style={{
        position: "relative",
        background: "#fff",
        border: `${isPro ? "2px" : "1px"} solid ${isPro ? C.forest : C.border}`,
        borderRadius: 12,
        padding: 32,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        display: "flex", flexDirection: "column",
      }}>
      {tier.popular && (
        <div style={{ position: "absolute", top: -14, left: "50%",
          transform: "translateX(-50%)",
          background: C.forest, color: "#fff",
          fontSize: 11, fontWeight: 700, letterSpacing: 1,
          textTransform: "uppercase",
          padding: "5px 14px", borderRadius: 999 }}>
          Most popular
        </div>
      )}
      <h3 style={{ fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 600,
        color: C.ink, margin: "0 0 4px" }}>{tier.name}</h3>
      <p style={{ fontSize: 13, color: C.muted, margin: "0 0 20px" }}>{tier.tagline}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 22 }}>
        <span style={{ fontFamily: FONT_SERIF, fontSize: 48, fontWeight: 600,
          color: C.ink, lineHeight: 1, letterSpacing: "-0.02em" }}>
          ${tier.price}
        </span>
        <span style={{ fontSize: 15, color: C.muted, fontWeight: 500 }}>/month</span>
      </div>
      <div style={{ height: 1, background: C.border, marginBottom: 22 }} />
      <ul style={{ listStyle: "none", padding: 0, margin: 0, flex: 1,
        display: "flex", flexDirection: "column", gap: 12 }}>
        {tier.features.map((f, i) => (
          <li key={i} style={{ display: "flex", gap: 10, fontSize: 14,
            color: C.ink, lineHeight: 1.4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke={C.forest} strokeWidth="2.5" strokeLinecap="round"
              strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <button onClick={() => navigate(target)} style={{
        marginTop: 24, width: "100%", padding: "12px 18px",
        borderRadius: 10, border: tier.ctaVariant === "primary"
          ? "none" : `1px solid ${C.forest}`,
        background: tier.ctaVariant === "primary" ? C.forest : "transparent",
        color: tier.ctaVariant === "primary" ? "#fff" : C.forest,
        fontFamily: FONT_SANS, fontSize: 14, fontWeight: 600, cursor: "pointer",
        transition: "all 200ms ease",
      }}>{tier.ctaLabel}</button>
      {tier.id === "free" && (
        <p style={{ fontSize: 12, color: C.muted, margin: "10px 0 0",
          textAlign: "center" }}>No credit card required.</p>
      )}
    </div>
  );
}

function TrustStrip() {
  const items = [
    { label: "Legally binding", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    )},
    { label: "ESIGN & UETA compliant", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    )},
    { label: "Encrypted in transit & at rest", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    )},
    { label: "Cancel anytime", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    )},
    { label: "Made in USA", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.forest}
        strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    )},
  ];
  return (
    <section style={{ padding: "0 24px 56px" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto",
        display: "flex", flexWrap: "wrap", justifyContent: "center",
        alignItems: "center", gap: 28, fontSize: 13, color: C.muted,
        fontFamily: FONT_SANS }}>
        {items.map((it, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {it.icon}<span>{it.label}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

function FinalCTA({ isAuthed }) {
  const navigate = useNavigate();
  const startTarget = isAuthed ? "/" : "/signup";
  return (
    <section style={{ background: C.paperDark, padding: "72px 24px",
      borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 720, margin: "0 auto", textAlign: "center" }}>
        <h2 style={{ fontFamily: FONT_SERIF, fontSize: 36, fontWeight: 600,
          margin: "0 0 12px", color: C.ink, letterSpacing: "-0.01em" }}>
          Ready to start signing?
        </h2>
        <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.5, margin: "0 0 24px" }}>
          Set up your first envelope in under 2 minutes.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => navigate(startTarget)} style={{
            background: C.forest, color: "#fff", border: "none",
            padding: "12px 22px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 15, fontWeight: 600, cursor: "pointer",
          }}>{isAuthed ? "Open dashboard" : "Start free"}</button>
          <a href="mailto:hello@sign-flow.net" style={{
            background: "transparent", color: C.forest,
            border: `1px solid ${C.forest}`,
            padding: "12px 22px", borderRadius: 10, fontFamily: FONT_SANS,
            fontSize: 15, fontWeight: 600, textDecoration: "none",
          }}>Talk to us</a>
        </div>
      </div>
    </section>
  );
}

function PageStyles() {
  return (
    <style>{`
      .pricing-card { transition: transform 200ms ease, box-shadow 200ms ease; }
      .pricing-card--popular { transform: translateY(-8px); }
      .pricing-card button:hover { filter: brightness(0.95); }
      .pricing-card button:hover { transform: translateY(-1px); }
      .faq-item {
        border-bottom: 1px solid ${C.border};
        padding: 14px 0;
      }
      .faq-item:first-of-type { border-top: 1px solid ${C.border}; }
      .faq-summary {
        list-style: none;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 15px;
        font-weight: 600;
        color: ${C.ink};
        font-family: ${FONT_SANS};
      }
      .faq-summary::-webkit-details-marker { display: none; }
      .faq-chevron {
        color: ${C.muted};
        font-size: 22px;
        transition: transform 200ms ease;
        line-height: 1;
      }
      details[open] .faq-chevron { transform: rotate(90deg); }
      @media (max-width: 880px) {
        .pricing-grid { grid-template-columns: 1fr !important; gap: 16px !important; }
        .pricing-card--popular { transform: none; }
      }
    `}</style>
  );
}
