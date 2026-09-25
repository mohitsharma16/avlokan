export const handle = { public: true };

import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        background: "var(--bg)",
        fontFamily: "var(--font-apple)",
        textAlign: "center",
        padding: 24,
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-tertiary)" }}>
        Avlokan
      </span>
      <h1 style={{ fontSize: 72, fontWeight: 700, letterSpacing: "-0.04em", color: "var(--text-primary)", margin: 0, lineHeight: 1 }}>
        404
      </h1>
      <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: 0 }}>
        Couldn't find what you were looking for.
      </p>
      <Link to="/" className="apple-btn-primary" style={{ marginTop: 12, fontSize: 14.5, padding: "10px 22px" }}>
        Back to home
      </Link>
    </div>
  );
}
