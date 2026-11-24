import React, { useId, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Mark } from "../landing/icons";

export default function AuthForm() {
  const { login, pb } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorId = useId();

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
    <div className="av-auth" style={{ minHeight: "100vh", display: "grid", background: "var(--color-bg)", fontFamily: "var(--font-sans)" }}>
      {/* Brand side — hidden on small screens so the form comes first */}
      <aside className="av-auth-brand" aria-hidden style={{ position: "relative", overflow: "hidden", padding: "48px 56px", flexDirection: "column", justifyContent: "space-between", background: "#09090B", color: "#F5F5F4", borderRight: "1px solid var(--color-border)" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 20% 0%, rgba(255,107,74,0.18), transparent 60%)" }} />
        <div className="av-grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.4 }} />
        <Link to="/" tabIndex={-1} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 650, fontSize: 19, letterSpacing: "-0.03em", color: "inherit", textDecoration: "none" }}>
          <Mark size={24} /> Avlokan
        </Link>
        <div style={{ position: "relative" }}>
          <p className="av-display" style={{ margin: 0, fontSize: "clamp(40px, 4.4vw, 64px)" }}>
            Creative feedback.<br /><span style={{ color: "#A1A1AA" }}>Finally in focus.</span>
          </p>
          <p style={{ marginTop: 20, maxWidth: 380, fontSize: 16, lineHeight: 1.55, color: "#A1A1AA" }}>
            Annotations, conversations and revisions in one visual review workflow.
          </p>
        </div>
      </aside>

      <main style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div className="av-anim-fade-in" style={{ width: "100%", maxWidth: 380 }}>
          <span className="av-auth-mobile-brand" style={{ alignItems: "center", gap: 9, fontWeight: 650, fontSize: 19, letterSpacing: "-0.03em", marginBottom: 40 }}>
            <Mark size={24} /> Avlokan
          </span>
          <h1 style={{ fontSize: 30, fontWeight: 650, letterSpacing: "-0.035em", margin: 0 }}>Sign in</h1>
          <p style={{ fontSize: 15, color: "var(--color-text-secondary)", margin: "8px 0 32px" }}>Use your work email and password.</p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }} aria-describedby={error ? errorId : undefined}>
            {error && (
              <div id={errorId} role="alert" style={{ padding: "10px 14px", background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", border: "1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)", borderRadius: "var(--av-radius-md)", color: "var(--color-danger)", fontSize: 13 }}>
                {error}
              </div>
            )}
            <div>
              <label className="av-label" htmlFor="av-email">Email</label>
              <input id="av-email" type="email" name="email" autoComplete="email" placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="av-input" />
            </div>
            <div>
              <label className="av-label" htmlFor="av-password">Password</label>
              <input id="av-password" type="password" name="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className="av-input" />
            </div>
            <button type="submit" disabled={loading} className="av-btn av-btn-primary av-btn-lg" style={{ marginTop: 8, width: "100%" }}>
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </main>

      <style>{`
        .av-auth-brand { display: none; }
        .av-auth-mobile-brand { display: inline-flex; }
        @media (min-width: 900px) {
          .av-auth { grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); }
          .av-auth-brand { display: flex; }
          .av-auth-mobile-brand { display: none; }
        }
      `}</style>
    </div>
  );
}
