import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { useDocTitle } from '../utils';
import { LogoMark } from '../components/ui';
import { T, F } from '../theme';

// Theme-driven palette with hex fallbacks (so this still renders even if a token is missing)
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
  panelDot:    T?.panel?.dot         || '#7DCB94',
  panelBorder: T?.panel?.border      || 'rgba(250, 250, 247, 0.18)',
  panelFill:   T?.panel?.fill        || 'rgba(250, 250, 247, 0.06)',
  errorBg:     T?.status?.errorBg    || '#FCEBEB',
  errorBorder: T?.status?.errorBorder|| '#F0B5B5',
  errorText:   T?.status?.errorText  || '#A32D2D',
};

const FONT_SERIF = F?.serif || '"Fraunces", Georgia, serif';
const FONT_SANS  = F?.sans  || '"Inter", system-ui, sans-serif';
const FONT_MONO  = F?.mono  || 'ui-monospace, "SF Mono", Menlo, monospace';

// ───────────────── Module-level subcomponents ─────────────────
// Hoisted out of Signup() so their identity is stable across renders.
// Defining them inside the parent caused inputs to lose focus after every
// keystroke (React unmounts/remounts when component identity changes).

function FieldLabel({ children }) {
  return (
    <label
      style={{
        display: 'block', fontSize: 12, fontWeight: 500,
        color: C.inkLabel, margin: '0 0 -8px', letterSpacing: '0.02em',
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

function FormBody({
  email, setEmail, password, setPassword,
  emailFocus, setEmailFocus, passwordFocus, setPasswordFocus,
  submitting, error, onSubmit, inputBase, inputFocused,
}) {
  return (
    <div style={{ margin: '2rem 0', maxWidth: 380 }}>
      <p
        style={{
          fontSize: 12, fontWeight: 500, color: C.forest,
          letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1rem',
        }}
      >
        Get started
      </p>
      <h1
        style={{
          fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 500,
          lineHeight: 1.05, letterSpacing: '-0.02em', color: C.ink, margin: '0 0 0.75rem',
        }}
      >
        Create your<br />account.
      </h1>
      <p style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.55, margin: '0 0 1.75rem' }}>
        Send your first document in under a minute. No credit card required.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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

          <FieldLabel>Password</FieldLabel>
          <input
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocus(true)}
            onBlur={() => setPasswordFocus(false)}
            style={{ ...inputBase, ...(passwordFocus ? inputFocused : null) }}
          />

          {error && <ErrorBox>{error}</ErrorBox>}

          <button
            type="submit"
            disabled={submitting}
            className="signup-btn-primary"
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
            {submitting ? 'Creating account…' : 'Create account →'}
          </button>

          <Divider />

          <button
            type="button"
            className="signup-btn-google"
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
  );
}

function SuccessBody({ email, onResend, resendCooldown, error }) {
  return (
    <div style={{ margin: '2rem 0', maxWidth: 380 }}>
      <div
        style={{
          width: 48, height: 48, borderRadius: 10,
          background: '#EFEDE3',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '1.25rem',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C.forest} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M3 7l9 6 9-6" />
        </svg>
      </div>

      <p
        style={{
          fontSize: 12, fontWeight: 500, color: C.forest,
          letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 1rem',
        }}
      >
        Almost there
      </p>
      <h1
        style={{
          fontFamily: FONT_SERIF, fontSize: 38, fontWeight: 500,
          lineHeight: 1.05, letterSpacing: '-0.02em', color: C.ink, margin: '0 0 0.75rem',
        }}
      >
        Check your<br />email.
      </h1>
      <p style={{ fontSize: 14, color: C.inkMuted, lineHeight: 1.55, margin: '0 0 0.5rem' }}>
        We've sent a confirmation link to:
      </p>
      <p
        style={{
          fontSize: 14, fontWeight: 500, color: C.ink,
          margin: '0 0 1.5rem', wordBreak: 'break-all',
        }}
      >
        {email}
      </p>
      <p style={{ fontSize: 13, color: C.inkMuted, lineHeight: 1.55, margin: '0 0 1.75rem' }}>
        Click the link in the email to verify your account and start sending documents. The link expires in 24 hours.
      </p>

      {error && <ErrorBox>{error}</ErrorBox>}

      <div
        style={{
          padding: '1rem 1.1rem',
          background: '#F4F2EA',
          borderRadius: 8,
          fontSize: 13, color: C.inkMuted, lineHeight: 1.5,
        }}
      >
        <strong style={{ color: C.ink, fontWeight: 500 }}>Didn't receive it?</strong>{' '}
        Check your spam folder, or{' '}
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0}
          className="signup-resend"
          style={{
            background: 'none', border: 'none', padding: 0,
            color: C.forest, fontWeight: 500, cursor: 'pointer',
            fontFamily: FONT_SANS, fontSize: 13,
            transition: 'color 140ms ease',
          }}
        >
          {resendCooldown > 0 ? `resend in ${resendCooldown}s` : 'resend the email'}
        </button>.
      </div>
    </div>
  );
}

function SignerRow({ name, timestamp }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 6px' }}>
      <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.panelDot }} />
      <span style={{ fontSize: 12, color: C.panelText }}>{name}</span>
      <span style={{ fontSize: 11, color: C.panelSoft, marginLeft: 'auto' }}>{timestamp}</span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontFamily: FONT_SERIF, fontSize: 24, fontWeight: 500,
          color: C.panelText, letterSpacing: '-0.01em',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: C.panelSoft, letterSpacing: '0.04em' }}>
        {label}
      </div>
    </div>
  );
}

function TrustPanel() {
  return (
    <div
      className="signup-panel"
      style={{
        background: C.forest, padding: '3rem 2.75rem', color: C.panelText,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden', minHeight: '100vh',
      }}
    >
      <svg
        aria-hidden="true"
        style={{ position: 'absolute', top: '2rem', right: '2rem', opacity: 0.18 }}
        width="100" height="100" viewBox="0 0 80 80" fill="none"
      >
        <path
          d="M5 60 Q 20 25, 40 45 T 75 35"
          stroke={C.panelText} strokeWidth="1.5" strokeLinecap="round" fill="none"
        />
      </svg>

      <div>
        <p
          style={{
            fontSize: 11, fontWeight: 500, color: C.panelMuted,
            letterSpacing: '0.14em', textTransform: 'uppercase', margin: '0 0 1.25rem',
          }}
        >
          Why Sign Flow
        </p>
        <p
          style={{
            fontFamily: FONT_SERIF, fontSize: 26, lineHeight: 1.3,
            fontWeight: 400, letterSpacing: '-0.01em', margin: 0,
            color: C.panelText, maxWidth: 360,
          }}
        >
          Tamper-evident. Court-admissible. Built in the United States.
        </p>
      </div>

      <div
        style={{
          background: C.panelFill, border: `0.5px solid ${C.panelBorder}`,
          borderRadius: 10, padding: '1.1rem 1.2rem',
          backdropFilter: 'blur(4px)', margin: '2rem 0', maxWidth: 420,
        }}
      >
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            margin: '0 0 12px',
          }}
        >
          <span style={{ fontFamily: FONT_SERIF, fontSize: 14, color: C.panelText }}>
            Certificate of Completion
          </span>
          <span
            style={{
              fontSize: 10, color: C.panelSoft,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >
            Verified
          </span>
        </div>
        <div
          style={{
            fontSize: 11, color: C.panelMuted,
            letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 4px',
          }}
        >
          Document fingerprint
        </div>
        <div
          style={{
            fontFamily: FONT_MONO, fontSize: 10, color: C.panelText,
            opacity: 0.85, wordBreak: 'break-all', lineHeight: 1.5, margin: '0 0 14px',
          }}
        >
          a8f3c92d1e0b7f4a55d816a3f8c7e9d4b2a1f6c0e3d8b
        </div>

        <div style={{ borderTop: `0.5px solid ${C.panelBorder}`, paddingTop: 12 }}>
          <div
            style={{
              fontSize: 11, color: C.panelMuted,
              letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 8px',
            }}
          >
            Signers
          </div>
          <SignerRow name="Sarah Mitchell" timestamp="Apr 30 · 14:23 UTC" />
          <SignerRow name="James Chen" timestamp="May 01 · 09:11 UTC" />
        </div>
      </div>

      <div
        style={{
          display: 'flex', gap: '2rem', paddingTop: '1rem',
          borderTop: `0.5px solid ${C.panelBorder}`,
        }}
      >
        <Stat label="SHA encryption" value="256-bit" />
        <Stat label="Act compliant" value="ESIGN" />
        <Stat label="Hosted & operated" value="USA" />
      </div>
    </div>
  );
}

// ───────────────── The page itself ─────────────────

export function Signup() {
  useDocTitle('Sign Up');

  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setError(null);

    if (!email || !password) {
      setError('Please fill in both fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: signUpError, data } = await signUp(email, password);
      if (signUpError) {
        setError(signUpError.message || 'Could not create account.');
        return;
      }

      // If a session came back immediately, email confirmation is OFF in Supabase —
      // user is fully authenticated and can go straight to the app.
      if (data?.session) {
        navigate('/');
        return;
      }

      // Otherwise, email confirmation is ON — show the success/check-your-email screen.
      setSuccess(true);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      // Re-trigger the signup; Supabase resends the confirmation email for unconfirmed accounts.
      await signUp(email, password);
      // Start a 30-second cooldown so users don't spam the button.
      setResendCooldown(30);
      const interval = setInterval(() => {
        setResendCooldown((c) => {
          if (c <= 1) { clearInterval(interval); return 0; }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err?.message || 'Could not resend email.');
    }
  };

  // Shared input styles
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
          .signup-grid { grid-template-columns: 1fr !important; }
          .signup-panel { display: none !important; }
        }
        .signup-btn-primary:hover:not(:disabled) { background: ${C.forestDeep}; }
        .signup-btn-primary:active:not(:disabled) { transform: translateY(1px); }
        .signup-btn-google:hover { border-color: ${C.forest}; }
        .signup-link:hover { text-decoration: underline; }
        .signup-resend:hover:not(:disabled) { color: ${C.forestDeep}; }
        .signup-resend:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>

      <div
        className="signup-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
        }}
      >
        {/* LEFT — form OR success state */}
        <div
          style={{
            padding: '3rem 2.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100vh',
          }}
        >
          {/* Brand mark + wordmark — always visible */}
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

          {success ? (
            <SuccessBody
              email={email}
              onResend={handleResend}
              resendCooldown={resendCooldown}
              error={error}
            />
          ) : (
            <FormBody
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              emailFocus={emailFocus}
              setEmailFocus={setEmailFocus}
              passwordFocus={passwordFocus}
              setPasswordFocus={setPasswordFocus}
              submitting={submitting}
              error={error}
              onSubmit={handleSubmit}
              inputBase={inputBase}
              inputFocused={inputFocused}
            />
          )}

          {!success && (
            <p style={{ fontSize: 12, color: C.inkSoft, margin: '1.5rem 0 0' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                className="signup-link"
                style={{ color: C.forest, fontWeight: 500, textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </p>
          )}

          {success && (
            <p style={{ fontSize: 12, color: C.inkSoft, margin: '1.5rem 0 0' }}>
              Wrong email?{' '}
              <button
                type="button"
                onClick={() => { setSuccess(false); setError(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  color: C.forest,
                  fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: FONT_SANS,
                  fontSize: 12,
                }}
              >
                Go back
              </button>
            </p>
          )}
        </div>

        {/* RIGHT — trust panel (unchanged across both states) */}
        <TrustPanel />
      </div>
    </div>
  );
}
