import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { F } from "../theme";
import { useDocTitle, useT } from "../utils";
import { useAuth } from "../lib/AuthContext";
import { Ic, I, Btn, Card, Input } from "../components/ui";

export function Login() {
  const T = useT();
  useDocTitle("Sign In");
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      navigate("/");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="True Legacy Homes" style={{ height: 56, marginBottom: 12 }} />
          <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>Legacy Sign</h1>
          <p style={{ fontSize: 13, color: T.textSec, margin: 0 }}>Sign in to your account</p>
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
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Password</label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password"
                placeholder="••••••••" required />
            </div>
            <div style={{ textAlign: "right", marginBottom: 20 }}>
              <Link to="/forgot-password" style={{ fontSize: 12, color: T.accent, textDecoration: "none" }}>
                Forgot password?
              </Link>
            </div>
            <Btn type="submit" disabled={loading || !email || !password} size="lg"
              style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Signing in..." : "Sign In"}
            </Btn>
          </form>
        </Card>

        <p style={{ textAlign: "center", fontSize: 13, color: T.textSec, marginTop: 20 }}>
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: T.accent, textDecoration: "none", fontWeight: 600 }}>Sign up</Link>
        </p>
      </div>
    </div>
  );
}
