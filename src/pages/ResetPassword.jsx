import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme";
import { useDocTitle, useT } from "../utils";
import { useAuth } from "../lib/AuthContext";
import { Ic, I, Btn, Card, Input } from "../components/ui";

export function ResetPassword() {
  const T = useT();
  useDocTitle("Set New Password");
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    const { error } = await updatePassword(password);
    setLoading(false);
    if (error) setError(error.message);
    else navigate("/");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: T.bg, padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: T.accentSoft,
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <Ic d={I.shield} size={24} color={T.accent} s />
          </div>
          <h1 style={{ fontFamily: F.display, fontSize: 28, fontWeight: 600, margin: "0 0 4px" }}>New Password</h1>
          <p style={{ fontSize: 13, color: T.textSec, margin: 0 }}>Choose a new password for your account</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: T.errorSoft,
                color: T.error, fontSize: 12, fontWeight: 500, marginBottom: 16 }}>{error}</div>
            )}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>New Password</label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password"
                placeholder="At least 6 characters" required autoFocus />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: T.text, marginBottom: 6 }}>Confirm Password</label>
              <Input value={confirm} onChange={e => setConfirm(e.target.value)} type="password"
                placeholder="••••••••" required />
            </div>
            <Btn type="submit" disabled={loading || !password || !confirm} size="lg"
              style={{ width: "100%", justifyContent: "center" }}>
              {loading ? "Updating..." : "Update Password"}
            </Btn>
          </form>
        </Card>
      </div>
    </div>
  );
}
