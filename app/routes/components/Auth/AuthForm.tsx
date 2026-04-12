import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function AuthForm() {
  const { login, pb } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const authData = await pb
        .collection("users")
        .authWithPassword(email, password);
      login(authData.token, authData.record);
    } catch (err: any) {
      setError("Incorrect email or password.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "var(--font-apple)",
        padding: "24px",
      }}
    >
      <div
        className="animate-apple-scale-in"
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-2xl)",
          boxShadow: "var(--shadow-modal)",
          padding: "48px 40px 40px",
        }}
      >
        {/* Logo / Brand */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {/* Apple-style icon mark */}
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 18px",
              boxShadow: "0 6px 16px rgba(0,113,227,0.35)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect x="4" y="4" width="20" height="20" rx="4" stroke="#fff" strokeWidth="2.5"/>
              <path d="M9 14h10M14 9v10" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            Sign in to Avlokan
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 6 }}>
            Use your work email and password
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                background: "rgba(255,69,58,0.08)",
                border: "1px solid rgba(255,69,58,0.2)",
                borderRadius: "var(--radius-md)",
                color: "#FF453A",
                fontSize: 13,
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="apple-input"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary)" }}>
              Password
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="apple-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="apple-btn-primary"
            style={{ marginTop: 8, width: "100%", padding: "13px 22px", fontSize: 16 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
