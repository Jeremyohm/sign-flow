import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { F } from "../theme";
import { useDocTitle, useT } from "../utils";
import { useAuth } from "../lib/AuthContext";
import { Ic, I, Btn, Card, Input } from "../components/ui";

export function Signup() {
  const T = useT();
  useDocTitle("Sign Up");
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: T.successSoft,
          display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <Ic d={I.mail} size={24} color={T.success} s />
        </div>
        <h2 style={{ fontFamily: F.display, fontSize: 22, fontWeight: 600, margin: "0 0 8px" }}>Check your email</h2>
        <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, marginBottom: 24 }}>
          We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
        </p>
        <Link to="/login" style={{ color: T.accent, textDecoration: "none", fontWeight: 600, fontSize: 13 }}>
          Back to sign in
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: T.accentSoft,
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Ic d={I.shield} size={24} color={T.accent} s />
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Create Account</h1>
          <p style={{ fontSize: 13, color: T.textSec, margin: 0 }}>Start sending documents for signature</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: T.errorSoft,
                color: T.error, fontSize: 12, fontWeight: 500, marginBottom: 16 }}>{error}</div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Email</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email"
                placeholder="you@example.com" required autoFocus />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Password</label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password"
                placeholder="At least 6 characters" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Confirm Password</label>
              <Input value={confirm} onChange={e => setConfirm(e.target.value)} type="password"
                placeholder="••••••••" required />
            </div>
            <Btn type="submit" disabled={loading || !email || !password || !confirm} size="lg"
              style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Creating account..." : "Create Account"}
            </Btn>
          </form>
        </Card>

        <p style={{ textAlign: "center", fontSize: 13, color: T.textSec, marginTop: 20 }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: T.accent, textDecoration: "none", fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
