import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useDocTitle } from '../utils';
import { LogoMark } from '../components/ui';
import { T, F } from '../theme';

// Theme-driven palette with hex fallbacks (matches Signup.jsx)
const C = {
  forest:      T?.brand?.forest      || '#1F4D2E',
  forestDeep:  T?.brand?.forestDeep  || '#163A22',
  cream:       T?.brand?.cream       || '#FAFAF7',
  ink:         T?.ink?.primary       || '#1A1A1A',
  inkMuted:    T?.ink?.muted         || '#5A5A55',
  inkSoft:     T?.ink?.soft          || '#8A8A82',
  inkLabel:    T?.ink?.label         || '#3A3A36',
  formBorder:  T?.form?.border       || '#D9D7CE',
  formBg:      T?.form?.bg           || '#FFFFFF',
  focusRing:   T?.form?.focusRing    || 'rgba(31, 77, 46, 0.10)',
  panelText:   T?.panel?.text        || '#FAFAF7',
  panelMuted:  T?.panel?.muted       || '#C8DBC2',
  panelSoft:   T?.panel?.soft        || '#9DB89A',
  panelBorder: T?.panel?.border      || 'rgba(250, 250, 247, 0.18)',
  errorBg:     T?.status?.errorBg    || '#FCEBEB',
  errorBorder: T?.status?.errorBorder|| '#F0B5B5',
  errorText:   T?.status?.errorText  || '#A32D2D',
};

const FONT_SERIF = F?.serif || '"Fraunces", Georgia, serif';
const FONT_SANS  = F?.sans  || '"Inter", system-ui, sans-serif';

// ───────────────── Module-level subcomponents ─────────────────
// Hoisted out of Login() so their identity is stable across renders. Defining
// them inside caused inputs to lose focus after every keystroke.

function FieldLabel({ children, inline = false }) {
  return (
    <label
      style={{
        display: inline ? 'inline-block' : 'block',
        fontSize: 12, fontWeight: 500,
        color: C.inkLabel,
        margin: inline ? 0 : '0 0 6px',
        letterSpacing: '0.02em',
      }}
    >
      {children}
    </label>
  );
}

function ErrorBox({ children }) {
  return (
    <div
      style={{
        fontSize: 13, color: C.errorText, background: C.errorBg,
        border: `1px solid ${C.errorBorder}`, borderRadius: 6, padding: '8px 11px',
      }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.formBorder }} />
      <span
        style={{
          fontSize: 11, color: C.inkSoft,
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}
      >
        or
      </span>
      <div style={{ flex: 1, height: 1, background: C.formBorder }} />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// Editorial pull-quote panel — quieter than signup's trust panel.
// Centered serif paragraph with em-dash ornaments and decorative flourishes.
function PullQuotePanel() {
  return (
    <div
      className="login-panel"
      style={{
        background: C.forest,
        padding: '3rem 3.5rem',
        color: C.panelText,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: '100vh',
      }}
    >
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', top: '2.5rem', right: '2.5rem', opacity: 0.15 }}
        width="120" height="120" viewBox="0 0 80 80" fill="none"
      >
        <path
          d="M5 60 Q 20 25, 40 45 T 75 35"
          stroke={C.panelText} strokeWidth="1.5" strokeLinecap="round" fill="none"
        />
      </svg>

      <svg
        aria-hidden="true"
        style={{
          position: 'absolute', bottom: '2.5rem', left: '2.5rem',
          opacity: 0.1, transform: 'scaleX(-1)',
        }}
        width="100" height="100" viewBox="0 0 80 80" fill="none"
      >
        <path
          d="M5 60 Q 20 25, 40 45 T 75 35"
          stroke={C.panelText} strokeWidth="1.5" strokeLinecap="round" fill="none"
        />
      </svg>

      <div style={{ maxWidth: 460, textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div
          aria-hidden="true"
          style={{
            width: 32, height: 1, background: C.panelMuted,
            margin: '0 auto 2rem', opacity: 0.6,
          }}
        />

        <p
          style={{
            fontFamily: FONT_SERIF,
            fontSize: 26, lineHeight: 1.45,
            fontWeight: 400, letterSpacing: '-0.005em',
            color: C.panelText, margin: 0, fontStyle: 'normal',
          }}
        >
          For as long as people have made promises to one another, they have signed their names to make them real.
          <span style={{ display: 'block', marginTop: '0.875rem', color: C.panelMuted, fontStyle: 'italic' }}>
            We just made the paper better.
          </span>
        </p>

        <div
          aria-hidden="true"
          style={{
            width: 32, height: 1, background: C.panelMuted,
            margin: '2rem auto 1.25rem', opacity: 0.6,
          }}
        />

        <p
          style={{
            fontSize: 11, fontWeight: 500, color: C.panelMuted,
            letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0,
          }}
        >
          Sign Flow
        </p>
      </div>
    </div>
  );
}

// ───────────────── The page itself ─────────────────

export function Login() {
  useDocTitle('Sign In');

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to wherever the user was trying to go before being bounced to /login,
  // or fall back to the app home.
  const redirectTo = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError(null);

    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        // Generic message — don't reveal whether the email exists
        setError('Incorrect email or password.');
        return;
      }
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputBase = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 13px',
    border: `1px solid ${C.formBorder}`,
    borderRadius: 6,
    background: C.formBg,
    fontSize: 14,
    color: C.ink,
    outline: 'none',
    fontFamily: FONT_SANS,
    transition: 'border-color 140ms ease, box-shadow 140ms ease',
  };
  const inputFocused = {
    borderColor: C.forest,
    boxShadow: `0 0 0 3px ${C.focusRing}`,
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.cream,
        fontFamily: FONT_SANS,
        color: C.ink,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
      }}
    >
      <style>{`
        @media (max-width: 880px) {
          .login-grid { grid-template-columns: 1fr !important; }
          .login-panel { display: none !important; }
        }
        .login-btn-primary:hover:not(:disabled) { background: ${C.forestDeep}; }
        .login-btn-primary:active:not(:disabled) { transform: translateY(1px); }
        .login-btn-google:hover { border-color: ${C.forest}; }
        .login-link:hover { text-decoration: underline; }
      `}</style>

      <div
        className="login-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
        }}
      >
        {/* LEFT — sign-in form */}
        <div
          style={{
            padding: '2rem 2.75rem 1.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '1.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoMark size={28} color={C.forest} />
            <span
              style={{
                fontFamily: FONT_SERIF,
                fontSize: 19,
                fontWeight: 500,
                color: C.forest,
                letterSpacing: '-0.01em',
              }}
            >
              Sign Flow
            </span>
          </div>

          <div style={{ maxWidth: 380 }}>
            <p
              style={{
                fontSize: 12, fontWeight: 500, color: C.forest,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                margin: '0 0 0.875rem',
              }}
            >
              Welcome back
            </p>
            <h1
              style={{
                fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 500,
                lineHeight: 1.05, letterSpacing: '-0.02em',
                color: C.ink, margin: '0 0 0.625rem',
              }}
            >
              Sign in to<br />Sign Flow.
            </h1>
            <p style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.55, margin: '0 0 1.5rem' }}>
              Pick up where you left off.
            </p>

            <form onSubmit={handleSubmit} noValidate>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <FieldLabel>Email</FieldLabel>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocus(true)}
                    onBlur={() => setEmailFocus(false)}
                    style={{ ...inputBase, ...(emailFocus ? inputFocused : null) }}
                  />
                </div>

                <div>
                  <div
                    style={{
                      display: 'flex', alignItems: 'baseline',
                      justifyContent: 'space-between', margin: '0 0 6px',
                    }}
                  >
                    <FieldLabel inline>Password</FieldLabel>
                    <Link
                      to="/forgot-password"
                      className="login-link"
                      style={{
                        fontSize: 12, color: C.forest,
                        fontWeight: 500, textDecoration: 'none',
                      }}
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPasswordFocus(true)}
                    onBlur={() => setPasswordFocus(false)}
                    style={{ ...inputBase, ...(passwordFocus ? inputFocused : null) }}
                  />
                </div>

                {error && <ErrorBox>{error}</ErrorBox>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="login-btn-primary"
                  style={{
                    marginTop: 6, padding: '12px 18px',
                    background: submitting ? C.forestDeep : C.forest,
                    color: C.cream, border: 'none', borderRadius: 6,
                    fontSize: 14, fontWeight: 500,
                    cursor: submitting ? 'not-allowed' : 'pointer',
                    fontFamily: FONT_SANS, letterSpacing: '0.01em',
                    transition: 'background 140ms ease, transform 80ms ease',
                  }}
                >
                  {submitting ? 'Signing in…' : 'Sign in →'}
                </button>

                <Divider />

                <button
                  type="button"
                  className="login-btn-google"
                  onClick={() => console.warn('Google OAuth — not yet wired')}
                  style={{
                    padding: '11px 14px', background: '#FFFFFF', color: C.ink,
                    border: `1px solid ${C.formBorder}`, borderRadius: 6,
                    fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: FONT_SANS,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'border-color 140ms ease',
                  }}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>
              </div>
            </form>
          </div>

          <p style={{ fontSize: 12, color: C.inkSoft, margin: 0 }}>
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="login-link"
              style={{ color: C.forest, fontWeight: 500, textDecoration: 'none' }}
            >
              Create one
            </Link>
          </p>
        </div>

        {/* RIGHT — editorial pull-quote panel */}
        <PullQuotePanel />
      </div>
    </div>
  );
}
