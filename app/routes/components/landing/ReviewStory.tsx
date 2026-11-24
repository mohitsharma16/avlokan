import React, { useRef } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { ProductWindow } from "./ReviewScene";
import { ScrollAt } from "../motion/ScrollAt";
import { MotionReveal } from "../motion/MotionReveal";
import { useAutoProgress, useCinematic, useStickyProgress } from "../motion/useScrollProgress";

type P = MotionValue<number>;

interface Chapter {
  id: string;
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  /** scroll range in which this chapter's copy is on screen: [in-start, in-end, out-start, out-end] */
  range: [number, number, number, number];
  /** for the vertical layout: progress range the scene plays through */
  play: [number, number];
}

const CHAPTERS: Chapter[] = [
  { id: "annotate", eyebrow: "01 — Annotate", title: "Say exactly what needs to change.", body: "Draw directly on the frame. Point to the problem. Leave context where it matters.", range: [0.01, 0.06, 0.28, 0.32], play: [0, 0.28] },
  { id: "act", eyebrow: "02 — Act", title: "Feedback shouldn't stop at comments.", body: "Turn a comment into a task, assign it to a teammate, and follow it from open to resolved.", range: [0.32, 0.36, 0.48, 0.52], play: [0.28, 0.5] },
  { id: "revise", eyebrow: "03 — Revise", title: "Every revision. One timeline.", body: "Each new upload lands beside the last one. Compare any two revisions side by side and see what changed.", range: [0.52, 0.56, 0.7, 0.74], play: [0.5, 0.72] },
  { id: "ai", eyebrow: "04 — Check", title: "Let AI catch what humans shouldn't have to.", body: "A first-pass review of typography, contrast, layout and accessibility — with findings pinned to the frame, inside the same review.", range: [0.74, 0.78, 0.88, 0.91], play: [0.72, 0.9] },
  { id: "done", eyebrow: "05 — Close", title: "Every task resolved. Every revision on the record.", body: "When the feedback is done, the review is done.", range: [0.92, 0.96, 1.01, 1.02], play: [0.9, 1] },
];

const STEPS = [
  { label: "Comment", at: 0.26 },
  { label: "Task", at: 0.36 },
  { label: "Assigned", at: 0.44 },
  { label: "In progress", at: 0.47 },
  { label: "Resolved", at: 0.92 },
];

const FlowStep: React.FC<{ p: P; label: string; at: number }> = ({ p, label, at }) => {
  const on = useTransform(p, [at - 0.01, at + 0.02], [0.3, 1], { clamp: true });
  return (
    <motion.li style={{ opacity: on, display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 550 }}>
      <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--color-accent)" }} />{label}
    </motion.li>
  );
};

const Dot: React.FC<{ p: P; c: Chapter }> = ({ p, c }) => {
  const scaleY = useTransform(p, [c.range[0], c.range[1]], [0.25, 1], { clamp: true });
  const last = c.range[3] > 1;
  const opacity = useTransform(p, last ? [c.range[0], c.range[1]] : c.range, last ? [0.3, 1] : [0.3, 1, 1, 0.3], { clamp: true });
  return <motion.span style={{ width: 3, height: 28, borderRadius: 3, background: "var(--color-accent)", opacity, scaleY, transformOrigin: "50% 100%" }} />;
};

const Title: React.FC<{ c: Chapter }> = ({ c }) => (
  <>
    <p className="av-eyebrow" style={{ marginBottom: 16, color: "var(--color-accent-text)" }}>{c.eyebrow}</p>
    <h2 className="av-h2" style={{ margin: 0, fontSize: "clamp(38px, 4.4vw, 62px)" }}>{c.title}</h2>
    <p className="av-lede" style={{ marginTop: 20, maxWidth: 440 }}>{c.body}</p>
  </>
);

const CinematicReview: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const p = useStickyProgress(ref);
  return (
    <section id="story" ref={ref} aria-label="How a review works" style={{ position: "relative", height: "900vh" }}>
      <span id="ai" aria-hidden style={{ position: "absolute", top: "570vh", height: 1 }} />
      <div style={{ position: "sticky", top: 0, height: "100vh", display: "grid", gridTemplateColumns: "minmax(300px, 0.7fr) minmax(0, 1.6fr)", alignItems: "center", gap: 56, padding: "72px clamp(24px, 4vw, 64px) 0", maxWidth: 1600, margin: "0 auto" }}>
        <div style={{ position: "relative", height: 520 }}>
          {CHAPTERS.map((c) => (
            <ScrollAt key={c.id} p={p} a={c.range[0]} b={c.range[1]} out={c.range[3] > 1 ? undefined : [c.range[2], c.range[3]]} dy={36} style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <Title c={c} />
              {c.id === "act" && (
                <ul style={{ listStyle: "none", margin: "28px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
                  {STEPS.map((s) => <FlowStep key={s.label} p={p} {...s} />)}
                </ul>
              )}
              {c.id === "revise" && (
                <ScrollAt p={p} a={0.62} b={0.66} dy={10} style={{ marginTop: 24 }}>
                  <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.03em", color: "var(--color-accent-text)" }}>See what changed.</span>
                </ScrollAt>
              )}
            </ScrollAt>
          ))}
          <div aria-hidden style={{ position: "absolute", left: -20, bottom: -8, display: "flex", gap: 6 }}>
            {CHAPTERS.map((c) => <Dot key={c.id} p={p} c={c} />)}
          </div>
        </div>
        <div style={{ borderRadius: "var(--av-radius-lg)", perspective: 1400 }}>
          <ProductWindow p={p} />
        </div>
      </div>
    </section>
  );
};

/** Vertical layout: every chapter is a normal block whose scene auto-plays when it scrolls into view. */
const ChapterBlock: React.FC<{ c: Chapter }> = ({ c }) => {
  const ref = useRef<HTMLDivElement>(null);
  const p = useAutoProgress(ref, c.play[0], c.play[1], 3.4);
  return (
    <div ref={ref} id={c.id === "ai" ? "ai" : undefined} style={{ display: "flex", flexDirection: "column", gap: 28, scrollMarginTop: 80 }}>
      <MotionReveal><Title c={c} /></MotionReveal>
      <MotionReveal kind="scale" style={{ borderRadius: "var(--av-radius-lg)" }}><ProductWindow p={p} /></MotionReveal>
    </div>
  );
};

const SimpleReview: React.FC = () => (
  <section id="story" aria-label="How a review works" style={{ padding: "72px 16px", maxWidth: 960, margin: "0 auto", display: "flex", flexDirection: "column", gap: 96 }}>
    {CHAPTERS.slice(0, 4).map((c) => <ChapterBlock key={c.id} c={c} />)}
  </section>
);

export const ReviewStory: React.FC = () => (useCinematic() ? <CinematicReview /> : <SimpleReview />);
export default ReviewStory;
