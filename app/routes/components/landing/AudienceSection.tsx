import React from "react";
import { MotionReveal } from "../motion/MotionReveal";

const Path = () => (
  <div className="av-mono" style={{ display: "flex", flexWrap: "wrap", gap: 8, fontSize: 12.5, color: "var(--color-text-tertiary)" }}>
    {["Client", "Project", "Asset", "Revision"].map((s, i, a) => (
      <React.Fragment key={s}><span style={{ color: i === a.length - 1 ? "var(--color-accent)" : undefined }}>{s}</span>{i < a.length - 1 && <span aria-hidden>/</span>}</React.Fragment>
    ))}
  </div>
);

const Chips = ({ items }: { items: { label: string; status: string }[] }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
    {items.map((i) => <span key={i.label} className="av-badge" data-status={i.status}>{i.label}</span>)}
  </div>
);

const BLOCKS = [
  {
    n: "01", who: "Freelancers",
    lines: ["Send one review link.", "Get actionable feedback."],
    visual: <span className="av-mono" style={{ fontSize: 12.5, color: "var(--color-text-secondary)", padding: "9px 14px", border: "1px solid var(--color-border-strong)", borderRadius: "var(--av-radius-sm)", background: "var(--color-surface)" }}>/revision/8f2a41c9?token=••••</span>,
  },
  {
    n: "02", who: "Agencies",
    lines: ["Keep every client review", "organized."],
    visual: <Path />,
  },
  {
    n: "03", who: "Creative teams",
    lines: ["From feedback to approval", "without the chaos."],
    visual: <Chips items={[{ label: "Open", status: "open" }, { label: "In progress", status: "in_progress" }, { label: "Resolved", status: "resolved" }]} />,
  },
];

export const AudienceSection: React.FC = () => (
  <section aria-label="Who Avlokan is for" style={{ padding: "clamp(72px, 10vw, 160px) 20px" }}>
    <div style={{ maxWidth: 1240, margin: "0 auto" }}>
      <MotionReveal as="p" className="av-eyebrow" style={{ marginBottom: 32 }}>Who it's for</MotionReveal>
      {BLOCKS.map((b) => (
        <MotionReveal key={b.n} as="div" distance={40}>
          <article
            className="av-audience-row"
            style={{ display: "grid", gap: 20, padding: "clamp(28px, 4vw, 56px) 0", borderTop: "1px solid var(--color-border)", gridTemplateColumns: "minmax(0,1fr)" }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
              <span className="av-mono" style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>{b.n}</span>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "var(--color-accent-text)" }}>{b.who}</h3>
            </div>
            <p className="av-h2" style={{ margin: 0, fontSize: "clamp(32px, 4.4vw, 60px)" }}>
              {b.lines.map((l, i) => <span key={l} style={{ display: "block", color: i === 1 ? "var(--color-text-secondary)" : undefined }}>{l}</span>)}
            </p>
            <div>{b.visual}</div>
          </article>
        </MotionReveal>
      ))}
      <div style={{ borderTop: "1px solid var(--color-border)" }} />
    </div>
    <style>{`@media (min-width: 900px){ .av-audience-row{ grid-template-columns: 200px minmax(0,1fr) 300px !important; align-items: center; } }`}</style>
  </section>
);
export default AudienceSection;
