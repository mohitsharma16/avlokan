import React, { useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { ScrollAt } from "../motion/ScrollAt";
import { MotionReveal } from "../motion/MotionReveal";
import { MotionStagger } from "../motion/MotionStagger";
import { useCinematic, useStickyProgress } from "../motion/useScrollProgress";

/** The scattered places feedback lives today. Positions are % of the stage. */
export const SCATTER = [
  { label: "Drive", x: 12, y: 24, r: -4, s: 1, a: 0.06 },
  { label: "Slack", x: 74, y: 18, r: 3, s: 1, a: 0.1 },
  { label: "Email", x: 22, y: 70, r: 2, s: 1, a: 0.14 },
  { label: "WhatsApp", x: 70, y: 66, r: -3, s: 1, a: 0.18 },
  { label: "Version 8", x: 41, y: 14, r: 2, s: 0.92, mono: true, a: 0.22 },
  { label: "Version 8 FINAL", x: 5, y: 47, r: -2, s: 0.92, mono: true, a: 0.27 },
  { label: "Version 8 FINAL 2", x: 58, y: 84, r: 2, s: 0.92, mono: true, a: 0.32 },
];

const Chip: React.FC<{ p: MotionValue<number>; item: (typeof SCATTER)[number]; depth: number }> = ({ p, item, depth }) => {
  const opacity = useTransform(p, [item.a, item.a + 0.07, 0.5, 0.6], [0, 1, 1, 0], { clamp: true });
  const y = useTransform(p, [0, 1], [30 * depth, -130 * depth]);
  const blur = useTransform(p, [0.5, 0.6], ["blur(0px)", "blur(6px)"], { clamp: true });
  return (
    <motion.span
      className={item.mono ? "av-mono" : undefined}
      style={{
        position: "absolute", left: `${item.x}%`, top: `${item.y}%`, opacity, y, filter: blur, rotate: item.r,
        padding: item.mono ? "8px 14px" : "10px 18px", borderRadius: "var(--av-radius-md)", border: "1px solid var(--color-border-strong)",
        background: "var(--color-surface)", color: "var(--color-text-secondary)", whiteSpace: "nowrap",
        fontSize: item.mono ? 15 : 20, fontWeight: 500, letterSpacing: item.mono ? 0 : "-0.02em",
      }}
    >{item.label}</motion.span>
  );
};

const Line: React.FC<{ children: React.ReactNode; muted?: boolean }> = ({ children, muted }) => (
  <h2 className="av-h2" style={{ margin: 0, textAlign: "center", maxWidth: 1000, padding: "0 24px", color: muted ? "var(--color-text-secondary)" : undefined }}>{children}</h2>
);

const CinematicStory: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useStickyProgress(ref);
  const center: React.CSSProperties = { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" };
  return (
    <section ref={ref} aria-label="The problem" style={{ position: "relative", height: "480vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        <ScrollAt p={p} a={0} b={0.03} out={[0.36, 0.44]} dy={30} style={center}>
          <Line>Feedback is everywhere.</Line>
        </ScrollAt>
        <div aria-hidden style={{ position: "absolute", inset: "8% 6%" }}>
          {SCATTER.map((it, i) => <Chip key={it.label} p={p} item={it} depth={0.6 + (i % 3) * 0.4} />)}
        </div>
        <ScrollAt p={p} a={0.56} b={0.64} out={[0.76, 0.82]} dy={30} style={center}>
          <Line>But the review <span style={{ color: "var(--color-text-tertiary)" }}>isn't.</span></Line>
        </ScrollAt>
        <ScrollAt p={p} a={0.82} b={0.9} dy={30} style={center}>
          <Line>There should be one place to review <span style={{ color: "var(--color-accent-text)" }}>creative work.</span></Line>
        </ScrollAt>
      </div>
    </section>
  );
};

const SimpleStory: React.FC = () => (
  <section aria-label="The problem" style={{ padding: "96px 20px" }}>
    <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 48, alignItems: "center" }}>
      <MotionReveal><Line>Feedback is everywhere.</Line></MotionReveal>
      <MotionStagger gap={0.07} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
        {SCATTER.map((it) => (
          <MotionStagger.Item key={it.label}>
            <span className={it.mono ? "av-mono" : undefined} style={{ display: "inline-block", padding: "9px 16px", borderRadius: "var(--av-radius-md)", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-secondary)", fontSize: it.mono ? 14 : 17, fontWeight: 500 }}>{it.label}</span>
          </MotionStagger.Item>
        ))}
      </MotionStagger>
      <MotionReveal><Line muted>But the review isn't.</Line></MotionReveal>
      <MotionReveal><Line>There should be one place to review <span style={{ color: "var(--color-accent-text)" }}>creative work.</span></Line></MotionReveal>
    </div>
  </section>
);

export const ProblemStory: React.FC = () => (useCinematic() ? <CinematicStory /> : <SimpleStory />);
export default ProblemStory;
