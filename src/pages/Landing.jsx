import { useState, useEffect, useRef } from "react";
import { Ic, I, LogoMark } from "../components/ui";

// True at module evaluation if the OS preference is set. Computed lazily so
// reduced-motion users get instant render with no transition flash.
const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Reveals children once on scroll-into-view. Respects prefers-reduced-motion
// (immediate reveal, no transition). One-shot — never re-animates.
function RevealOnScroll({ children, delay = 0 }) {
  const reduceMotion = prefersReducedMotion();
  const [revealed, setRevealed] = useState(reduceMotion);
  const ref = useRef(null);

  useEffect(() => {
    if (revealed) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <div
      ref={ref}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: reduceMotion
          ? "none"
          : `opacity 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, transform 600ms cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        willChange: "opacity, transform",
      }}
    >
      {children}
    </div>
  );
}

// Trust strip: separate component so we can trigger both row reveal and
// stroke-in icon animation from the same intersection observer.
function TrustStrip({ items }) {
  const reduceMotion = prefersReducedMotion();
  const [revealed, setRevealed] = useState(reduceMotion);
  const ref = useRef(null);

  useEffect(() => {
    if (revealed) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [revealed]);

  return (
    <section className="lp-trust" ref={ref}>
      <div
        className={`lp-container lp-trust-row ${revealed ? "is-revealed" : ""}`}
        style={{
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(12px)",
          transition: reduceMotion
            ? "none"
            : "opacity 600ms cubic-bezier(0.22, 1, 0.36, 1), transform 600ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {items.map((t, i) => (
          <div key={t.label} className="lp-trust-item" style={{ "--idx": i }}>
            <Ic d={t.icon} size={22} color={C.accent} s />
            <span>{t.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

// FAQ accordion item — animates open/close with grid-template-rows trick.
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lp-faq-item">
      <button
        type="button"
        className="lp-faq-q"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <span>{q}</span>
        <svg
          className={`lp-faq-chevron ${open ? "is-open" : ""}`}
          width="14" height="14" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div className={`lp-faq-a ${open ? "is-open" : ""}`}>
        <div className="lp-faq-a-inner">{a}</div>
      </div>
    </div>
  );
}

const C = {
  ink: "#0F1418",
  paper: "#FAFAF7",
  paperWarm: "#F2F2EE",
  accent: "#1E5128",
  accentHover: "#163C1E",
  footerBg: "#EAEAE6",
  muted: "#5A6168",
  subtle: "#9CA3A8",
  rule: "#D6D8DA",
};

const FONT_DISPLAY = "'Fraunces', Georgia, serif";
const FONT_BODY = "'Inter', system-ui, sans-serif";

const trustItems = [
  { icon: I.lock, label: "ESIGN & UETA Compliant" },
  { icon: I.shield, label: "Made & Operated in the US" },
  { icon: I.clock, label: "Tamper-Evident Audit Trail" },
  { icon: I.file, label: "Certificate of Completion" },
];

const tldrBlocks = [
  { title: "What it is",
    body: "E-signature platform. You upload a PDF, people sign it, you get the signed PDF back. The hard part is making sure that holds up legally. We did the hard part." },
  { title: "What you don't deal with",
    body: "No per-user pricing. No tiered feature gates on the things you actually need. No add-on for the audit trail." },
  { title: "What's included on every plan",
    body: "ESIGN/UETA compliance. Tamper-evident document hashing. Full audit trail with IP and timestamp capture. Certificate of Completion on every signed document." },
  { title: "Where it runs",
    body: "United States. American infrastructure, American law, American jurisdiction." },
];

const faqs = [
  { q: "Is this legally binding?",
    a: "Yes. Sign Flow is built around the federal ESIGN Act and state UETA frameworks — the same legal basis DocuSign and HelloSign rely on. Every signer affirmatively consents to using electronic signatures, and the consent is preserved with the exact disclosure text, timestamp, IP address, and user agent. Each completed document includes a Certificate of Completion that holds up as evidence in court." },
  { q: "How does this compare to DocuSign?",
    a: "We do the e-signature part with the same legal standing, without the per-user pricing, the upsells, or the enterprise-sales pressure. We don't do AI agreement analysis, contract lifecycle management, or whatever DocuSign's launching this quarter. If you need those, DocuSign is fine. If you just need documents signed, we're cheaper and simpler." },
  { q: "What happens if I cancel?",
    a: "Your existing signed documents stay accessible — you can download them anytime. We don't hold completed contracts hostage. Future envelopes won't be available, and you'll lose access to drafts and templates. No cancellation fee, no retention calls." },
  { q: "Can I use my own branding on signing pages?",
    a: <>Custom branding is on the roadmap and will be available on the paid plan. Free tier signing pages show "Sign Flow" branding. If white-labeling is critical for you right now, we're probably not the right fit yet — but tell us what you need at <a href="mailto:hello@sign-flow.net" className="lp-inline-link">hello@sign-flow.net</a> and we'll let you know when it ships.</> },
  { q: "Is there an API?",
    a: "Yes, on the paid plan. Standard REST endpoints for envelope creation, signer management, and webhook subscriptions. Documentation lives at /docs (coming soon). Free tier doesn't include API access — that's the main thing the paid plan unlocks beyond higher envelope volume." },
  { q: "Where is my data stored?",
    a: "In the United States. All Sign Flow infrastructure — application servers, database, document storage, email delivery — runs on US-based providers under US law. Your documents don't leave the country. We don't have a European or Asian data center because we don't have European or Asian customers yet, and pretending we do would be dishonest." },
];

const steps = [
  { n: "01", title: "Upload", icon: I.upload, body: "Drag in any PDF. Supports up to 10MB." },
  { n: "02", title: "Add signers and fields", icon: I.pen, body: "Drop signature, initial, date, or text fields onto the document. Assign each to a recipient." },
  { n: "03", title: "Send", icon: I.send, body: "They get an email, sign on any device, and you get the completed document with a full audit trail." },
];

const compliance = [
  { icon: I.lock, eyebrow: "Federal & state law",
    title: "Every signature is legally binding.",
    body: "Sign Flow is built around the federal ESIGN Act and state UETA frameworks. Every signer affirmatively agrees to use electronic signatures before signing — and that consent is preserved with the exact disclosure text they saw, the timestamp, and the IP address." },
  { icon: I.clock, eyebrow: "Audit trail",
    title: "Every action recorded automatically.",
    body: "Every envelope captures every action: when it was sent, when each signer opened it, when they consented, when they signed each field. Timestamps, IP addresses, and user agents are recorded server-side for every event." },
  { icon: I.shield, eyebrow: "Tamper-evident",
    title: "If a byte changes, you'll know.",
    body: "Each completed document is fingerprinted with a SHA-256 cryptographic hash. If anyone alters a single byte after signing, the fingerprint won't match — and you can prove tampering." },
  { icon: I.file, eyebrow: "Certificate of completion",
    title: "An evidence packet with every document.",
    body: "When all signers have signed, Sign Flow generates a Certificate of Completion: a separate page that records the full audit trail and is appended to the signed PDF. It travels with your document forever." },
  { icon: I.check, eyebrow: "US infrastructure",
    title: "Made and operated in the United States.",
    body: "All Sign Flow infrastructure is hosted in the US, by US-based companies, under US law. Your documents don't leave the country and aren't subject to foreign disclosure laws." },
];

function CertMockup() {
  return (
    <svg
      viewBox="0 0 360 460"
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Certificate of Completion preview"
    >
      <g>
        {/* Page */}
        <rect x="20" y="20" width="320" height="420" rx="3" fill={C.paper} stroke={C.rule} strokeWidth="1" />
        {/* Header rule */}
        <line x1="40" y1="68" x2="320" y2="68" stroke={C.rule} strokeWidth="1" />
        {/* Wordmark */}
        <text x="40" y="56" fontFamily="'Fraunces', serif" fontSize="14" fontWeight="600" fill={C.accent}>
          Sign Flow
        </text>
        {/* Title */}
        <text x="40" y="110" fontFamily="'Fraunces', serif" fontSize="22" fontWeight="600" fill={C.ink}>
          Certificate of Completion
        </text>
        <text x="40" y="132" fontFamily="'Inter', sans-serif" fontSize="11" fill={C.muted}>
          Lease Agreement — 4280 Maple Ave
        </text>
        {/* Section: Document Fingerprint */}
        <text x="40" y="172" fontFamily="'Inter', sans-serif" fontSize="10" fontWeight="600"
          fill={C.muted} letterSpacing="1">
          DOCUMENT FINGERPRINT
        </text>
        <rect x="40" y="184" width="280" height="1" fill={C.rule} />
        <text x="40" y="204" fontFamily="'Inter', sans-serif" fontSize="9" fill={C.ink}>
          SHA-256
        </text>
        <text x="40" y="218" fontFamily="ui-monospace, Menlo, monospace" fontSize="8" fill={C.muted}>
          a8f3c92d1e0b7f4a55d816a3f8c7e9d4b2a1f6c0e3d8b
        </text>
        {/* Section: Signers */}
        <text x="40" y="254" fontFamily="'Inter', sans-serif" fontSize="10" fontWeight="600"
          fill={C.muted} letterSpacing="1">
          SIGNERS
        </text>
        <rect x="40" y="266" width="280" height="1" fill={C.rule} />
        {/* Signer 1 */}
        <circle cx="48" cy="288" r="4" fill={C.accent} />
        <text x="60" y="291" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="600" fill={C.ink}>
          Sarah Mitchell
        </text>
        <text x="60" y="304" fontFamily="'Inter', sans-serif" fontSize="9" fill={C.muted}>
          Signed 2026-04-30 14:23 UTC · 198.51.100.42
        </text>
        {/* Signer 2 */}
        <circle cx="48" cy="328" r="4" fill={C.accent} />
        <text x="60" y="331" fontFamily="'Inter', sans-serif" fontSize="11" fontWeight="600" fill={C.ink}>
          James Chen
        </text>
        <text x="60" y="344" fontFamily="'Inter', sans-serif" fontSize="9" fill={C.muted}>
          Signed 2026-05-01 09:11 UTC · 203.0.113.87
        </text>
        {/* Section: Audit timeline header */}
        <text x="40" y="382" fontFamily="'Inter', sans-serif" fontSize="10" fontWeight="600"
          fill={C.muted} letterSpacing="1">
          AUDIT TIMELINE
        </text>
        <rect x="40" y="394" width="280" height="1" fill={C.rule} />
        {/* timeline ticks */}
        <rect x="40" y="406" width="160" height="6" rx="1" fill={C.rule} />
        <rect x="40" y="418" width="220" height="6" rx="1" fill={C.rule} />
      </g>
    </svg>
  );
}

export function Landing() {
  return (
    <div className="lp-root">
      <style>{landingCss}</style>

      {/* Fixed top nav */}
      <header className="lp-nav">
        <div className="lp-container lp-nav-row">
          <a href="/" className="lp-nav-brand">
            <LogoMark size={28} />
            <span className="lp-nav-wordmark">Sign Flow</span>
          </a>
          <nav className="lp-nav-links">
            {/* TODO: /pricing page */}
            <a href="#" className="lp-nav-link">Pricing</a>
            <a href="/login" className="lp-nav-link">Sign in</a>
            <a href="/signup" className="lp-btn-primary lp-btn-small">Start free</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="lp-hero">
        <div className="lp-container lp-hero-grid">
          <div className="lp-hero-text">
            <h1 className="lp-h1">E-signatures that<br />hold up in court.</h1>
            <p className="lp-sub">
              Send documents, collect legally binding signatures, and get a tamper-evident audit
              trail with every envelope. Made and operated in the United States.
            </p>
            <div className="lp-cta-row">
              <a href="/signup" className="lp-btn-primary">Start signing free</a>
              <a href="#how-it-works" className="lp-btn-ghost">See how it works</a>
            </div>
          </div>
          <div className="lp-hero-visual" aria-hidden="true">
            <CertMockup />
          </div>
        </div>
      </section>

      {/* At a glance — 4-column strip after hero */}
      <section className="lp-glance">
        <div className="lp-container lp-glance-row">
          {tldrBlocks.map((b, i) => (
            <RevealOnScroll key={b.title} delay={i * 60}>
              <div className="lp-glance-col">
                <div className="lp-glance-title">{b.title}</div>
                <div className="lp-glance-body">{b.body}</div>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </section>

      {/* Trust strip — handles its own reveal + per-icon stroke-in stagger */}
      <TrustStrip items={trustItems} />

      {/* How it works */}
      <section id="how-it-works" className="lp-section lp-section-tight">
        <div className="lp-container">
          <RevealOnScroll>
            <h2 className="lp-h2">Three steps. No training required.</h2>
          </RevealOnScroll>
          <div className="lp-steps">
            {steps.map((s, i) => (
              <RevealOnScroll key={s.n} delay={i * 80}>
                <div className="lp-step">
                  <div className="lp-step-num">{s.n}</div>
                  <div className="lp-step-icon">
                    <Ic d={s.icon} size={22} color={C.accent} s />
                  </div>
                  <h3 className="lp-step-title">{s.title}</h3>
                  <p className="lp-step-body">{s.body}</p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
          <RevealOnScroll delay={240}>
            <p className="lp-closing-line">
              <span className="lp-closing-dot" aria-hidden="true">●</span>
              From upload to sent in under 90 seconds.
            </p>
            <hr className="lp-rule" />
          </RevealOnScroll>
        </div>
      </section>

      {/* Compliance story */}
      <section className="lp-section lp-section-warm">
        <div className="lp-container">
          <RevealOnScroll>
            <h2 className="lp-h2">Built for documents that matter.</h2>
          </RevealOnScroll>
          <div className="lp-compliance">
            {compliance.map((c, i) => (
              <RevealOnScroll key={c.title} delay={i * 80}>
                <div className={`lp-compliance-row ${i % 2 === 1 ? "reverse" : ""}`}>
                  <div className="lp-compliance-icon">
                    <Ic d={c.icon} size={48} color={C.accent} s />
                  </div>
                  <div className="lp-compliance-text">
                    <div className="lp-eyebrow">{c.eyebrow}</div>
                    <h3 className="lp-h3">{c.title}</h3>
                    <p className="lp-body">{c.body}</p>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="lp-section lp-section-tight">
        <RevealOnScroll>
          <div className="lp-container lp-pricing">
            <h2 className="lp-h2">Simple pricing. No per-user tax.</h2>
            <p className="lp-body lp-pricing-body">
              Most e-signature tools charge per user, per envelope, per add-on. Sign Flow doesn't.
              One flat plan covers your whole team. There's a free tier for individuals, too.
            </p>
            {/* TODO: /pricing page does not exist yet */}
            <a href="#" className="lp-link">See pricing <span className="lp-link-arrow" aria-hidden="true">→</span></a>
          </div>
        </RevealOnScroll>
      </section>

      {/* FAQ */}
      <section className="lp-section lp-section-tight lp-faq-section">
        <RevealOnScroll>
          <div className="lp-container">
            <h2 className="lp-h2">Questions you might have.</h2>
            <div className="lp-faq-grid">
              {faqs.map(f => (
                <FaqItem key={f.q} q={f.q} a={f.a} />
              ))}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* Closing CTA */}
      <section className="lp-section lp-section-tight lp-section-warm lp-closing">
        <RevealOnScroll>
          <div className="lp-container" style={{ textAlign: "center" }}>
            <h2 className="lp-h2">Start signing in five minutes.</h2>
            <p className="lp-body">
              Free for individuals. No credit card required for the free tier.
            </p>
            <a href="/signup" className="lp-btn-primary lp-btn-large">Get Sign Flow free</a>
          </div>
        </RevealOnScroll>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <RevealOnScroll>
          <div className="lp-container lp-footer-row">
            <div className="lp-footer-brand">
              <div className="lp-wordmark">
                <LogoMark size={24} />
                <span>Sign Flow</span>
              </div>
              <div className="lp-footer-tag">Made and operated in the United States.</div>
              <div className="lp-footer-humanity">
                Built by a small team. Email us at{" "}
                <a href="mailto:hello@sign-flow.net" className="lp-footer-email">hello@sign-flow.net</a>
                {" "}— we'll actually respond.
              </div>
              <div className="lp-footer-copy">© 2026 Sign Flow. All rights reserved.</div>
            </div>
            {/* TODO: /pricing, /terms, /privacy, /security, /contact pages don't exist yet */}
            <nav className="lp-footer-links">
              <a href="#">Pricing</a>
              <a href="#">Terms</a>
              <a href="#">Privacy</a>
              <a href="#">Security</a>
              <a href="#">Contact</a>
            </nav>
          </div>
        </RevealOnScroll>
      </footer>
    </div>
  );
}

const landingCss = `
.lp-root {
  background-color: ${C.paper};
  color: ${C.ink};
  font-family: ${FONT_BODY};
  min-height: 100vh;
}
.lp-container { max-width: 1200px; margin: 0 auto; padding: 0 32px; position: relative; }

.lp-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background: ${C.paper};
  border-bottom: 1px solid ${C.rule};
  height: 64px;
}
.lp-nav-row {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.lp-nav-brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: ${C.accent};
  text-decoration: none;
}
.lp-nav-brand svg,
.lp-nav-brand .lp-nav-wordmark {
  transition: transform 200ms ease;
}
.lp-nav-brand:hover svg { transform: scale(1.05); }
.lp-nav-brand:hover .lp-nav-wordmark { transform: translateX(1px); }
@media (prefers-reduced-motion: reduce) {
  .lp-nav-brand svg,
  .lp-nav-brand .lp-nav-wordmark { transition: none; }
  .lp-nav-brand:hover svg,
  .lp-nav-brand:hover .lp-nav-wordmark { transform: none; }
}
.lp-nav-links { display: flex; align-items: center; gap: 24px; }
.lp-nav-link {
  font-size: 14px;
  font-weight: 500;
  color: ${C.ink};
  text-decoration: none;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-nav-link:hover { color: ${C.accent}; }
.lp-btn-small { padding: 9px 16px; font-size: 14px; }

.lp-hero {
  padding: 184px 0 96px;
  border-bottom: 1px solid ${C.rule};
  position: relative;
  overflow: hidden;
  min-height: min(720px, 85vh);
}
.lp-hero-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 540px);
  gap: 64px;
  align-items: center;
}
.lp-hero-text { min-width: 0; }
.lp-hero-visual {
  position: relative;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  pointer-events: none;
}
.lp-hero-visual svg {
  width: 100%;
  max-width: 520px;
  height: auto;
  filter: drop-shadow(0 24px 48px rgba(15, 20, 24, 0.08));
  animation: cert-float 5s ease-in-out infinite;
  will-change: transform;
}
@keyframes cert-float {
  0%, 100% { transform: translateY(0px) rotate(2deg); }
  50%      { transform: translateY(-4px) rotate(2deg); }
}
@media (prefers-reduced-motion: reduce) {
  .lp-hero-visual svg { animation: none; transform: rotate(2deg); }
}
.lp-h1 {
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 60px;
  line-height: 1.05;
  letter-spacing: -0.02em;
  margin: 0 0 24px;
  color: ${C.ink};
}
.lp-sub {
  font-size: 20px;
  line-height: 1.5;
  color: ${C.muted};
  max-width: 56ch;
  margin: 0 0 40px;
}
.lp-cta-row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
.lp-btn-primary {
  display: inline-block;
  background: ${C.accent};
  color: ${C.paper};
  padding: 14px 28px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-btn-primary:hover {
  background: ${C.accentHover};
  transform: translateY(-1px);
}
.lp-btn-primary:active { transform: translateY(0); }
.lp-btn-large { padding: 18px 36px; font-size: 17px; }
.lp-btn-ghost {
  display: inline-block;
  color: ${C.ink};
  padding: 14px 28px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 16px;
  text-decoration: none;
  border: 1px solid ${C.rule};
  background: transparent;
  transition: background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), border-color 150ms cubic-bezier(0.4, 0, 0.2, 1), transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-btn-ghost:hover {
  background: rgba(0, 0, 0, 0.04);
  border-color: ${C.ink};
  transform: translateY(-1px);
}
.lp-btn-ghost:active { transform: translateY(0); }

.lp-trust {
  background: ${C.paperWarm};
  border-top: 1px solid ${C.rule};
  border-bottom: 1px solid ${C.rule};
  padding: 22px 0;
}
.lp-trust-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  align-items: center;
  gap: 16px;
}
.lp-trust-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 500;
  color: ${C.ink};
  white-space: nowrap;
}
/* Per-icon stroke-in: paths start invisible (huge dasharray, full offset), then
   draw to 0 offset when the row's IntersectionObserver flips is-revealed.
   --idx is set inline per item; cascade is 100ms. */
.lp-trust-row svg path {
  stroke-dasharray: 200;
  stroke-dashoffset: 200;
  transition: stroke-dashoffset 600ms ease-out;
  transition-delay: calc(var(--idx, 0) * 100ms);
}
.lp-trust-row.is-revealed svg path { stroke-dashoffset: 0; }
@media (prefers-reduced-motion: reduce) {
  .lp-trust-row svg path { stroke-dashoffset: 0; transition: none; }
}
@media (max-width: 1080px) {
  .lp-trust-row { grid-template-columns: repeat(2, 1fr); gap: 14px 24px; }
  .lp-trust-item { font-size: 14px; }
}

.lp-section { padding: 112px 0; }
.lp-section-tight { padding: 80px 0; }
.lp-section-tight .lp-h2 { margin-bottom: 48px; }
.lp-section-warm { background: ${C.paperWarm}; border-top: 1px solid ${C.rule}; border-bottom: 1px solid ${C.rule}; }

.lp-h2 {
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 44px;
  line-height: 1.15;
  letter-spacing: -0.015em;
  margin: 0 0 64px;
  color: ${C.ink};
  max-width: 22ch;
}
.lp-h3 {
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 26px;
  line-height: 1.2;
  margin: 0 0 12px;
  color: ${C.ink};
}
.lp-body {
  font-size: 18px;
  line-height: 1.55;
  color: ${C.muted};
  margin: 0;
}
.lp-eyebrow {
  font-family: ${FONT_BODY};
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${C.accent};
  margin-bottom: 8px;
}

.lp-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 48px;
}
.lp-step { display: flex; flex-direction: column; align-items: flex-start; }
.lp-step-num {
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 36px;
  color: ${C.subtle};
  margin-bottom: 16px;
  letter-spacing: -0.01em;
}
.lp-step-icon { margin-bottom: 16px; }
.lp-step-title {
  font-family: ${FONT_BODY};
  font-weight: 600;
  font-size: 18px;
  margin: 0 0 8px;
  color: ${C.ink};
}
.lp-step-body { font-size: 16px; line-height: 1.55; color: ${C.muted}; margin: 0; }
.lp-rule { border: 0; border-top: 1px solid ${C.rule}; margin: 24px 0 0; }
.lp-closing-line {
  font-family: ${FONT_BODY};
  font-weight: 600;
  font-size: 18px;
  letter-spacing: -0.005em;
  color: ${C.ink};
  margin: 48px 0 0;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
}
.lp-closing-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${C.accent};
  font-size: 0;
}

.lp-compliance { display: flex; flex-direction: column; gap: 72px; }
.lp-compliance-row {
  display: flex;
  align-items: flex-start;
  gap: 48px;
}
.lp-compliance-row.reverse { flex-direction: row-reverse; }
.lp-compliance-icon {
  flex: 0 0 calc(33.333% - 24px);
  display: flex;
  justify-content: flex-start;
  padding-top: 8px;
}
.lp-compliance-row.reverse .lp-compliance-icon { justify-content: flex-end; }
.lp-compliance-text { flex: 1 1 auto; min-width: 0; max-width: 60ch; }

.lp-pricing { text-align: center; max-width: 720px; }
.lp-pricing .lp-h2 { margin: 0 auto 16px; max-width: none; }
.lp-pricing-body { margin: 0 auto 24px; max-width: 56ch; }
.lp-link {
  color: ${C.accent};
  font-weight: 600;
  text-decoration: none;
  font-size: 16px;
}
.lp-link-arrow {
  display: inline-block;
  margin-left: 4px;
  transition: transform 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-link:hover .lp-link-arrow { transform: translateX(3px); }

/* Keyboard-only focus rings, scoped to the landing page */
.lp-root a:focus-visible,
.lp-root button:focus-visible {
  outline: 2px solid rgba(30, 81, 40, 0.5);
  outline-offset: 2px;
  border-radius: 4px;
}

.lp-closing .lp-h2 { margin: 0 auto 16px; max-width: none; }
.lp-closing .lp-body { max-width: 480px; margin: 0 auto 32px; }

.lp-footer {
  background: ${C.footerBg};
  color: ${C.ink};
  padding: 64px 0;
  border-top: 1px solid ${C.rule};
}
.lp-footer-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 48px;
}
.lp-footer-brand { display: flex; flex-direction: column; gap: 8px; }
.lp-wordmark {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  font-family: ${FONT_DISPLAY};
  font-weight: 600;
  font-size: 22px;
  letter-spacing: -0.01em;
  color: ${C.accent};
  margin: 0;
}
.lp-footer-tag { font-family: ${FONT_BODY}; font-size: 13px; color: ${C.muted}; line-height: 1.5; }
.lp-footer-copy { font-family: ${FONT_BODY}; font-size: 13px; color: ${C.muted}; margin-top: 8px; }
.lp-footer-links {
  display: flex;
  gap: 28px;
  flex-wrap: wrap;
  align-items: center;
}
.lp-footer-links a {
  font-family: ${FONT_BODY};
  font-size: 14px;
  font-weight: 600;
  color: ${C.ink};
  text-decoration: none;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-footer-links a:hover { color: ${C.accent}; }

/* FAQ section */
.lp-faq-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 64px;
}
.lp-faq-item {
  border-bottom: 1px solid #E0E0DC;
}
.lp-faq-q {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
  background: none;
  border: none;
  cursor: pointer;
  font-family: ${FONT_BODY};
  font-size: 17px;
  font-weight: 600;
  color: ${C.ink};
  text-align: left;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-faq-q:hover { color: ${C.accent}; }
.lp-faq-chevron {
  flex: 0 0 auto;
  color: ${C.accent};
  transition: transform 200ms ease;
}
.lp-faq-chevron.is-open { transform: rotate(180deg); }
.lp-faq-a {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 300ms ease;
}
.lp-faq-a.is-open { grid-template-rows: 1fr; }
.lp-faq-a-inner {
  min-height: 0;
  overflow: hidden;
  font-family: ${FONT_BODY};
  font-size: 15px;
  line-height: 1.55;
  color: #3A4046;
  padding-bottom: 20px;
}
.lp-inline-link {
  color: ${C.accent};
  text-decoration: none;
  font-weight: 600;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-inline-link:hover { color: ${C.accentHover}; }

/* Footer humanity line */
.lp-footer-humanity {
  font-family: ${FONT_BODY};
  font-size: 13px;
  line-height: 1.5;
  color: ${C.muted};
  max-width: 460px;
}
.lp-footer-email {
  color: ${C.accent};
  text-decoration: none;
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);
}
.lp-footer-email:hover { color: ${C.accentHover}; }

/* At a glance strip — horizontal four-column block between hero and trust strip */
.lp-glance {
  background: ${C.paperWarm};
  border-top: 1px solid ${C.rule};
  padding: 64px 0;
}
.lp-glance-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32px;
}
.lp-glance-col { display: flex; flex-direction: column; gap: 8px; }
.lp-glance-title {
  font-family: ${FONT_BODY};
  font-size: 14px;
  font-weight: 600;
  color: ${C.ink};
}
.lp-glance-body {
  font-family: ${FONT_BODY};
  font-size: 14px;
  line-height: 1.5;
  color: #3A4046;
}
@media (max-width: 1023px) {
  .lp-glance-row { grid-template-columns: repeat(2, 1fr); gap: 32px 32px; }
}

@media (max-width: 768px) {
  .lp-container { padding: 0 24px; }
  .lp-hero { padding: 144px 0 64px; }
  .lp-glance { padding: 48px 0; }
  .lp-glance-row { grid-template-columns: 1fr; gap: 32px; }
  .lp-faq-grid { grid-template-columns: 1fr; column-gap: 0; }
  .lp-faq-q { font-size: 16px; }
  .lp-h1 { font-size: 44px; }
  .lp-sub { font-size: 17px; margin-bottom: 32px; }
  .lp-section { padding: 72px 0; }
  .lp-section-tight { padding: 56px 0; }
  .lp-section-tight .lp-h2 { margin-bottom: 32px; }
  .lp-h2 { font-size: 32px; margin-bottom: 40px; }
  .lp-h3 { font-size: 22px; }
  .lp-body { font-size: 16px; }
  .lp-steps { grid-template-columns: 1fr; gap: 40px; }
  .lp-compliance { gap: 48px; }
  .lp-compliance-row,
  .lp-compliance-row.reverse {
    flex-direction: column;
    gap: 16px;
  }
  .lp-compliance-row.reverse .lp-compliance-icon { justify-content: flex-start; }
  .lp-compliance-icon { flex: 0 0 auto; }
  .lp-trust-row { grid-template-columns: repeat(2, 1fr); gap: 16px 24px; }
  .lp-trust-item { font-size: 14px; white-space: normal; }
  .lp-nav-links { gap: 16px; }
  .lp-nav-link { font-size: 13px; }
  .lp-hero-grid { grid-template-columns: 1fr; gap: 0; }
  .lp-hero-visual { display: none; }
  .lp-footer-row { flex-direction: column; gap: 32px; }
}

html { scroll-behavior: smooth; }
`;
