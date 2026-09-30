import React, { useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { ScrollAt } from "../motion/ScrollAt";
import { MotionReveal } from "../motion/MotionReveal";
import { MotionStagger } from "../motion/MotionStagger";
import { useCinematic, useStickyProgress } from "../motion/useScrollProgress";

/** x/y are the start offsets in vw / vh from the centre of the stage. */
const BEFORE = [
  { label: "Drive", x: -34, y: -26 },
  { label: "Slack", x: 30, y: -32 },
  { label: "Email", x: -38, y: 20 },
  { label: "WhatsApp", x: 35, y: 24 },
  { label: "“final.mov”", x: -12, y: -38, mono: true },
  { label: "“final-v2.mov”", x: 12, y: 36, mono: true },
  { label: "“final-v2-final.mov”", x: -26, y: 4, mono: true },
];

const Piece: React.FC<{ p: MotionValue<number>; item: (typeof BEFORE)[number]; i: number }> = ({ p, item, i }) => {
  const x = useTransform(p, [0.08 + i * 0.01, 0.55], [`${item.x}vw`, "0vw"], { clamp: true });
  const y = useTransform(p, [0.08 + i * 0.01, 0.55], [`${item.y}vh`, "0vh"], { clamp: true });
  const scale = useTransform(p, [0.1, 0.55], [1, 0.5], { clamp: true });
  const opacity = useTransform(p, [0, 0.06, 0.46, 0.58], [0, 1, 1, 0], { clamp: true });
  return (
    <motion.span
      className={item.mono ? "av-mono" : undefined}
      style={{ position: "absolute", left: "50%", top: "50%", x, y, scale, opacity, translateX: "-50%", translateY: "-50%", padding: "9px 16px", borderRadius: "var(--av-radius-md)", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-secondary)", fontSize: item.mono ? 14 : 18, fontWeight: 500, whiteSpace: "nowrap" }}
    >{item.label}</motion.span>
  );
};

const MarkBig = () => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden style={{ width: "0.8em", height: "0.8em" }}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="3.4" fill="var(--color-accent)" />
  </svg>
);

const Brand: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2em", fontSize: "clamp(52px, 13vw, 190px)", fontWeight: 650, letterSpacing: "-0.05em", lineHeight: 1 }}>
    <MarkBig />AVLOKAN
  </div>
);

const Cinematic: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useStickyProgress(ref);
  const lineW = useTransform(p, [0.66, 0.86], ["0%", "100%"], { clamp: true });
  return (
    <section id="workflow" ref={ref} aria-label="One place for the review" style={{ position: "relative", height: "340vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="av-grid-bg" aria-hidden style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
        <div aria-hidden style={{ position: "absolute", inset: 0 }}>
          {BEFORE.map((b, i) => <Piece key={b.label} p={p} item={b} i={i} />)}
        </div>
        <ScrollAt p={p} a={0.5} b={0.7} dy={24} from={0.94} style={{ textAlign: "center" }}>
          <Brand />
          <motion.div aria-hidden style={{ height: 3, margin: "22px auto 0", width: lineW, maxWidth: 420, background: "var(--color-accent)", borderRadius: 3 }} />
        </ScrollAt>
        <ScrollAt p={p} a={0.74} b={0.88} dy={18} style={{ position: "absolute", left: 0, right: 0, bottom: "18vh", textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "clamp(20px, 2.4vw, 32px)", fontWeight: 500, letterSpacing: "-0.03em", color: "var(--color-text-secondary)" }}>One place for the review.</p>
        </ScrollAt>
      </div>
    </section>
  );
};

const Simple: React.FC = () => (
  <section id="workflow" aria-label="One place for the review" style={{ padding: "96px 20px", textAlign: "center" }}>
    <MotionStagger gap={0.06} style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 560, margin: "0 auto" }}>
      {BEFORE.map((b) => (
        <MotionStagger.Item key={b.label}>
          <span className={b.mono ? "av-mono" : undefined} style={{ display: "inline-block", padding: "8px 14px", borderRadius: "var(--av-radius-md)", border: "1px solid var(--color-border-strong)", background: "var(--color-surface)", color: "var(--color-text-tertiary)", fontSize: b.mono ? 13 : 16 }}>{b.label}</span>
        </MotionStagger.Item>
      ))}
    </MotionStagger>
    <MotionReveal style={{ margin: "56px 0 12px" }}><Brand /></MotionReveal>
    <MotionReveal delay={0.1}><p style={{ margin: 0, fontSize: 20, color: "var(--color-text-secondary)", letterSpacing: "-0.02em" }}>One place for the review.</p></MotionReveal>
  </section>
);

export const WorkflowTransformation: React.FC = () => (useCinematic() ? <Cinematic /> : <Simple />);
export default WorkflowTransformation;
