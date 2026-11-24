import React from "react";
import { Link } from "react-router-dom";
import { Mark } from "./icons";

const col = (title: string, links: { label: string; href: string; to?: boolean }[]) => (
  <nav aria-label={title}>
    <p className="av-eyebrow" style={{ margin: "0 0 16px", fontSize: 11 }}>{title}</p>
    <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {links.map((l) => (
        <li key={l.label}>
          {l.to ? <Link to={l.href} className="av-nav-link" style={{ padding: 0 }}>{l.label}</Link> : <a href={l.href} className="av-nav-link" style={{ padding: 0 }}>{l.label}</a>}
        </li>
      ))}
    </ul>
  </nav>
);

export const Footer: React.FC = () => (
  <footer style={{ borderTop: "1px solid var(--color-border)", padding: "72px 20px 40px" }}>
    <div style={{ maxWidth: 1240, margin: "0 auto", display: "grid", gap: 48, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
      <div style={{ gridColumn: "span 2", minWidth: 200 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 650, fontSize: 20, letterSpacing: "-0.03em" }}><Mark size={24} />Avlokan</span>
        <p style={{ margin: "14px 0 0", maxWidth: 300, fontSize: 14, lineHeight: 1.55, color: "var(--color-text-tertiary)" }}>Creative review, finally in focus.</p>
      </div>
      {col("Product", [{ label: "Overview", href: "#product" }, { label: "How a review works", href: "#story" }, { label: "AI review", href: "#ai" }, { label: "Workflow", href: "#workflow" }])}
      {col("Account", [{ label: "Start Reviewing", href: "/app", to: true }, { label: "Sign in", href: "/app", to: true }])}
    </div>
    <div style={{ maxWidth: 1240, margin: "56px auto 0", paddingTop: 24, borderTop: "1px solid var(--color-border)", fontSize: 13, color: "var(--color-text-tertiary)" }}>
      © {new Date().getFullYear()} Avlokan. All rights reserved.
    </div>
  </footer>
);
export default Footer;
