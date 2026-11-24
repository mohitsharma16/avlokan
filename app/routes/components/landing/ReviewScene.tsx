import React from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import { Check, Pen, TaskIcon, Warn, Mark } from "./icons";
import { ScrollAt as At } from "../motion/ScrollAt";

type P = MotionValue<number>;

/** Story timeline, in normalised progress. Shared by the sticky scene and its mobile auto-play. */
export const T = {
  draw: [0.08, 0.2], stamp: [0.2, 0.26], comment: [0.26, 0.34], task: [0.34, 0.42], assign: [0.42, 0.5],
  rev: [0.5, 0.58], compare: [0.62, 0.72], ai: [0.72, 0.9], done: [0.9, 1],
} as const;

const Avatar = ({ letter, tone = "accent" }: { letter: string; tone?: "accent" | "neutral" }) => (
  <span
    aria-hidden
    style={{
      width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "inline-flex", alignItems: "center", justifyContent: "center",
      font: "600 10.5px var(--font-sans)",
      background: tone === "accent" ? "var(--color-accent)" : "var(--color-bg-tertiary)",
      color: tone === "accent" ? "var(--color-accent-ink)" : "var(--color-text-primary)",
      border: tone === "accent" ? "none" : "1px solid var(--color-border-strong)",
    }}
  >{letter}</span>
);

/* ───────────────────────── Video frame ───────────────────────── */

const Scene = ({ rev }: { rev: 1 | 2 }) => (
  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(165deg,#1b272d 0%,#4a3d38 46%,#b9835c 100%)" }}>
    <div style={{ position: "absolute", left: "50%", top: "46%", width: "78%", aspectRatio: "1", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(255,216,175,0.95) 0%, rgba(255,192,142,0.55) 34%, transparent 64%)" }} />
    {rev === 2 && <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 46%, rgba(22,14,10,0.62), rgba(22,14,10,0.2) 75%)" }} />}
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "34%", background: "linear-gradient(to top, rgba(8,8,10,0.8), transparent)" }} />
    <div
      style={{
        position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", whiteSpace: "nowrap",
        font: "700 7cqw var(--font-sans)", letterSpacing: "0.18em", paddingLeft: "0.18em",
        color: rev === 1 ? "rgba(255,238,218,0.5)" : "#fff",
        textShadow: rev === 2 ? "0 2px 26px rgba(0,0,0,0.35)" : "none",
      }}
    >NORTHWIND</div>
    <div style={{ position: "absolute", left: "50%", top: "61%", transform: "translateX(-50%)", whiteSpace: "nowrap", font: "500 1.9cqw var(--font-mono)", letterSpacing: "0.32em", color: "rgba(255,234,214,0.4)" }}>
      SPRING COLLECTION 2026
    </div>
  </div>
);

const PEN_X = ["50%", "78%", "80%", "50%", "20%", "18%", "35%", "52%"];
const PEN_Y = ["31%", "40%", "56%", "66%", "58%", "44%", "34%", "31%"];
const PEN_IN = [0.08, 0.104, 0.128, 0.152, 0.16, 0.176, 0.19, 0.2];

export const VideoFrame: React.FC<{ p: P }> = ({ p }) => {
  const pos = useTransform(p, [0.5, 0.56, 0.62, 0.64, 0.68, 0.72, 0.74], [100, 0, 0, 50, 25, 72, 0], { clamp: true });
  const clip = useTransform(pos, (v) => `inset(0% ${100 - v}% 0% 0%)`);
  const dividerLeft = useTransform(pos, (v) => `${v}%`);
  const dividerOpacity = useTransform(p, [0.5, 0.52, 0.555, 0.575, 0.6, 0.62, 0.72, 0.74], [0, 1, 1, 0, 0, 1, 1, 0], { clamp: true });
  const pathLength = useTransform(p, [T.draw[0], T.draw[1]], [0, 1], { clamp: true });
  const penX = useTransform(p, PEN_IN, PEN_X, { clamp: true });
  const penY = useTransform(p, PEN_IN, PEN_Y, { clamp: true });
  const penOpacity = useTransform(p, [0.06, 0.08, 0.2, 0.23], [0, 1, 1, 0], { clamp: true });
  const strokeOpacity = useTransform(p, [0.9, 1], [1, 0.35], { clamp: true });

  return (
    <div style={{ position: "relative", aspectRatio: "16 / 9", overflow: "hidden", borderRadius: "var(--av-radius-md)", containerType: "inline-size", border: "1px solid var(--color-border)", background: "#0a0a0c" }}>
      <Scene rev={2} />
      <motion.div style={{ position: "absolute", inset: 0, clipPath: clip }}><Scene rev={1} /></motion.div>

      {/* compare divider */}
      <motion.div aria-hidden style={{ position: "absolute", top: 0, bottom: 0, width: 2, left: dividerLeft, opacity: dividerOpacity, background: "#fff", boxShadow: "0 0 0 1px rgba(0,0,0,0.25)" }}>
        <span style={{ position: "absolute", top: "50%", left: "50%", width: 22, height: 22, borderRadius: "50%", transform: "translate(-50%,-50%)", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.4)" }} />
      </motion.div>
      <At p={p} a={0.62} b={0.64} out={[0.72, 0.74]} style={{ position: "absolute", left: 10, top: 10 }}>
        <span className="av-badge av-badge-plain" style={{ background: "rgba(10,10,12,0.75)", color: "#fff", borderColor: "rgba(255,255,255,0.18)" }}>R01 · before</span>
      </At>
      <At p={p} a={0.62} b={0.64} out={[0.72, 0.74]} style={{ position: "absolute", right: 10, top: 10 }}>
        <span className="av-badge av-badge-plain" style={{ background: "rgba(10,10,12,0.75)", color: "#fff", borderColor: "rgba(255,255,255,0.18)" }}>R02 · after</span>
      </At>

      {/* annotation stroke */}
      <motion.svg viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: strokeOpacity }}>
        <motion.path
          d="M 800 300 C 1150 290, 1360 380, 1330 450 C 1300 540, 1000 590, 780 585 C 480 580, 250 520, 275 430 C 300 340, 560 300, 830 305"
          fill="none" stroke="var(--color-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" style={{ pathLength }}
        />
      </motion.svg>
      <motion.div aria-hidden style={{ position: "absolute", left: penX, top: penY, opacity: penOpacity, x: -4, y: -20, color: "#fff", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))" }}>
        <Pen width={22} height={22} />
      </motion.div>

      {/* timestamp pinned to the annotation */}
      <At p={p} a={T.stamp[0]} b={T.stamp[1]} dy={6} style={{ position: "absolute", left: "15%", top: "21%" }}>
        <span className="av-mono" style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 8px", borderRadius: 6, background: "var(--color-accent)", color: "var(--color-accent-ink)", fontSize: 11, fontWeight: 600 }}>00:12:08</span>
      </At>

      {/* AI callout */}
      <At p={p} a={0.82} b={0.86} out={[0.9, 0.93]} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: "29%", top: "56.5%", width: "42%", height: "9%", border: "1.5px dashed var(--color-warning)", borderRadius: 6, background: "color-mix(in srgb, var(--color-warning) 12%, transparent)" }} />
        <div style={{ position: "absolute", left: "29%", top: "47%", display: "flex", alignItems: "center", gap: 6, height: 24, padding: "0 9px", borderRadius: 6, background: "rgba(12,12,14,0.9)", border: "1px solid color-mix(in srgb, var(--color-warning) 55%, transparent)", color: "var(--color-warning)", font: "550 11px var(--font-sans)", whiteSpace: "nowrap" }}>
          <Warn width={12} height={12} /> Low contrast detected
        </div>
        <div style={{ position: "absolute", left: "33%", top: "47%", marginTop: 24, width: 1.5, height: "9.5%", background: "var(--color-warning)" }} />
      </At>

      {/* approved */}
      <At p={p} a={0.92} b={0.97} dy={8} style={{ position: "absolute", right: 10, bottom: 10 }}>
        <span className="av-badge" data-status="resolved" style={{ background: "rgba(10,10,12,0.8)" }}>All tasks resolved</span>
      </At>
    </div>
  );
};

/* ───────────────────────── Timeline ───────────────────────── */

export const SceneTimeline: React.FC<{ p: P }> = ({ p }) => {
  const left = useTransform(p, [0, 0.08, 0.2], ["6%", "10%", "38%"], { clamp: true });
  const r2Active = useTransform(p, [0.5, 0.56], [0, 1], { clamp: true });
  const r1Active = useTransform(r2Active, (v) => 1 - v);
  return (
    <div style={{ position: "relative", marginTop: 10, padding: "8px 10px 10px", borderRadius: "var(--av-radius-md)", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)" }}>
      <div className="av-mono" style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: "var(--color-text-tertiary)", marginBottom: 4 }}>
        <span>00:00</span><span>00:10</span><span>00:20</span><span>00:30</span>
      </div>
      <div aria-hidden style={{ height: 14, backgroundImage: "repeating-linear-gradient(90deg, var(--color-border-strong) 0 1px, transparent 1px 12px)" }} />
      <div style={{ position: "relative", height: 22, marginTop: 2, borderRadius: 6, background: "var(--color-bg-tertiary)" }}>
        <At p={p} a={T.stamp[0]} b={T.stamp[1]} dy={0} from={0.4} style={{ position: "absolute", left: "38%", top: 4, width: 4, height: 14, borderRadius: 2, background: "var(--color-accent)" }} />
        <At p={p} a={0.83} b={0.86} dy={0} from={0.4} style={{ position: "absolute", left: "52%", top: 4, width: 4, height: 14, borderRadius: 2, background: "var(--color-warning)" }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8 }}>
        <span className="av-eyebrow" style={{ fontSize: 9.5 }}>Revisions</span>
        <div style={{ position: "relative" }}>
          <span className="av-badge av-badge-plain" style={{ position: "relative" }}>R01</span>
          <motion.span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 99, border: "1px solid var(--color-accent)", opacity: r1Active }} />
        </div>
        <At p={p} a={0.5} b={0.56} dx={-10} dy={0}>
          <span className="av-badge av-badge-plain" style={{ borderColor: "var(--color-accent)", color: "var(--color-accent-text)" }}>R02</span>
        </At>
      </div>
      {/* playhead */}
      <motion.div aria-hidden style={{ position: "absolute", left, top: 6, bottom: 34, width: 2, marginLeft: -1, background: "var(--color-accent)", borderRadius: 2 }}>
        <span style={{ position: "absolute", top: -3, left: "50%", width: 10, height: 10, transform: "translateX(-50%) rotate(45deg)", background: "var(--color-accent)", borderRadius: 2 }} />
      </motion.div>
    </div>
  );
};

/* ───────────────────────── Right panel ───────────────────────── */

const Cross: React.FC<{ p: P; points: number[]; values: number[]; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, points, values, children, style }) => {
  const opacity = useTransform(p, points, values, { clamp: true });
  return <motion.span style={{ ...style, opacity }}>{children}</motion.span>;
};

export const CommentsView: React.FC<{ p: P }> = ({ p }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span className="av-eyebrow" style={{ fontSize: 10.5 }}>Comments</span>
      <At p={p} a={T.comment[0]} b={T.comment[1]} dy={0}><span className="av-mono" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)" }}>1</span></At>
    </div>

    <At p={p} a={T.comment[0]} b={T.comment[1]} dy={16} className="av-surface" style={{ padding: 12, borderRadius: "var(--av-radius-md)", background: "var(--color-surface-elevated)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar letter="M" />
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Maya Chen</span>
        <span className="av-mono" style={{ fontSize: 10.5, color: "var(--color-accent-text)", marginLeft: "auto" }}>00:12:08</span>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.4, color: "var(--color-text-primary)" }}>Logo needs more contrast.</p>

      {/* comment → task */}
      <At p={p} a={T.task[0]} b={T.task[1]} dy={8}>
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 8 }}>
          <TaskIcon width={15} height={15} style={{ color: "var(--color-text-secondary)" }} />
          <span style={{ fontSize: 12, fontWeight: 550, color: "var(--color-text-secondary)" }}>Task</span>
          <span style={{ position: "relative", marginLeft: "auto", width: 100, height: 22 }}>
            <Cross p={p} points={[T.task[0], T.task[1], 0.44, 0.47]} values={[0, 1, 1, 0]} style={{ position: "absolute", right: 0 }}><span className="av-badge" data-status="open">Open</span></Cross>
            <Cross p={p} points={[0.44, 0.47, 0.9, 0.93]} values={[0, 1, 1, 0]} style={{ position: "absolute", right: 0 }}><span className="av-badge" data-status="in_progress">In progress</span></Cross>
            <Cross p={p} points={[0.9, 0.93]} values={[0, 1]} style={{ position: "absolute", right: 0 }}><span className="av-badge" data-status="resolved">Resolved <Check width={11} height={11} /></span></Cross>
          </span>
        </div>
        <At p={p} a={T.assign[0]} b={T.assign[1]} dy={6}>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--color-text-secondary)" }}>
            Assigned to <Avatar letter="S" tone="neutral" /> <span style={{ color: "var(--color-text-primary)", fontWeight: 550 }}>Sarah</span>
          </div>
        </At>
      </At>
    </At>

    <At p={p} a={0.54} b={0.6} dy={14} className="av-surface" style={{ padding: 12, borderRadius: "var(--av-radius-md)", marginLeft: 14, background: "var(--color-surface-elevated)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <Avatar letter="S" tone="neutral" />
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>Sarah Okafor</span>
        <span className="av-mono" style={{ fontSize: 10.5, color: "var(--color-text-tertiary)", marginLeft: "auto" }}>R02</span>
      </div>
      <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.4 }}>Contrast fixed in the new revision.</p>
    </At>
  </div>
);

const CHECKS = [
  { label: "Typography", at: 0.75, issues: 0 },
  { label: "Contrast", at: 0.78, issues: 1 },
  { label: "Layout", at: 0.81, issues: 0 },
  { label: "Accessibility", at: 0.84, issues: 0 },
];

export const AIView: React.FC<{ p: P; compact?: boolean }> = ({ p, compact }) => {
  const width = useTransform(p, [0.73, 0.85], ["0%", "100%"], { clamp: true });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="av-eyebrow" style={{ fontSize: 10.5, color: "var(--color-accent-text)" }}>AI review</span>
        <span style={{ position: "relative", fontSize: 11.5, color: "var(--color-text-secondary)", height: 16, width: 110, textAlign: "right" }}>
          <Cross p={p} points={[0.72, 0.73, 0.85, 0.86]} values={[0, 1, 1, 0]} style={{ position: "absolute", right: 0 }}>Reviewing asset…</Cross>
          <Cross p={p} points={[0.85, 0.87]} values={[0, 1]} style={{ position: "absolute", right: 0 }}>1 finding</Cross>
        </span>
      </div>
      <div style={{ height: 3, borderRadius: 3, background: "var(--color-bg-tertiary)", overflow: "hidden" }}>
        <motion.div style={{ height: "100%", width, background: "var(--color-accent)" }} />
      </div>

      {!compact && (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {CHECKS.map((c) => (
            <At key={c.label} p={p} a={c.at - 0.02} b={c.at} dy={6} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderBottom: "1px solid var(--color-border)" }}>
              <span style={{ color: "var(--color-success)", display: "inline-flex" }}><Check width={14} height={14} /></span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{c.label}</span>
              <span className="av-mono" style={{ marginLeft: "auto", fontSize: 10.5, color: c.issues ? "var(--color-warning)" : "var(--color-text-tertiary)" }}>
                {c.issues ? `${c.issues} issue` : "clear"}
              </span>
            </At>
          ))}
        </div>
      )}

      <At p={p} a={0.83} b={0.87} dy={12} className="av-surface" style={{ padding: 12, borderRadius: "var(--av-radius-md)", background: "var(--color-surface-elevated)", borderColor: "color-mix(in srgb, var(--color-warning) 35%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--color-warning)", fontSize: 12.5, fontWeight: 600 }}>
          <Warn width={14} height={14} /> Low contrast detected
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 12.5, lineHeight: 1.45, color: "var(--color-text-secondary)" }}>
          Tagline text is hard to read against the background. Darken it or add a scrim behind it.
        </p>
      </At>
    </div>
  );
};

/* ───────────────────────── Window ───────────────────────── */

export const ProductWindow: React.FC<{ p: P; variant?: "story" | "hero"; pAI?: P }> = ({ p, variant = "story", pAI }) => {
  const hero = variant === "hero";
  return (
    <div
      style={{
        position: "relative", overflow: "hidden", borderRadius: "inherit",
        background: "var(--color-surface)", border: "1px solid var(--color-border-strong)",
        boxShadow: "var(--av-shadow-deep), inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      {/* title bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: 44, borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-secondary)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontWeight: 650, fontSize: 13, letterSpacing: "-0.02em" }}><Mark size={16} />Avlokan</span>
        <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }} className="av-window-crumbs">Northwind <span aria-hidden>/</span> Spring Spot</span>
        <span style={{ marginLeft: "auto", position: "relative", display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ position: "relative", width: 34, height: 22 }}>
            <Cross p={p} points={[0.5, 0.53]} values={[1, 0]} style={{ position: "absolute", left: 0 }}><span className="av-badge av-badge-plain">R01</span></Cross>
            <Cross p={p} points={[0.5, 0.53]} values={[0, 1]} style={{ position: "absolute", left: 0 }}><span className="av-badge av-badge-plain" style={{ color: "var(--color-accent-text)", borderColor: "var(--color-accent)" }}>R02</span></Cross>
          </span>
          <span style={{ position: "relative", width: 84, height: 22 }}>
            <Cross p={p} points={[0.9, 0.93]} values={[1, 0]} style={{ position: "absolute", right: 0 }}><span className="av-badge" data-status="in_review">In review</span></Cross>
            <Cross p={p} points={[0.9, 0.93]} values={[0, 1]} style={{ position: "absolute", right: 0 }}><span className="av-badge" data-status="resolved">Resolved</span></Cross>
          </span>
        </span>
      </div>

      <div className="av-window-body">
        <div style={{ padding: 12, minWidth: 0 }}>
          <VideoFrame p={p} />
          <SceneTimeline p={p} />
        </div>
        <aside className="av-window-panel" style={{ position: "relative", padding: 12, borderLeft: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", minWidth: 0 }}>
          {hero ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <CommentsView p={p} />
              <AIView p={pAI ?? p} compact />
            </div>
          ) : (
            <div style={{ position: "relative", minHeight: 300 }}>
              <At p={p} a={0} b={0.01} out={[0.7, 0.72]} style={{ position: "absolute", inset: 0 }}><CommentsView p={p} /></At>
              <At p={p} a={0.71} b={0.73} out={[0.89, 0.91]} style={{ position: "absolute", inset: 0 }}><AIView p={p} /></At>
              <At p={p} a={0.9} b={0.92} style={{ position: "absolute", inset: 0 }}><CommentsView p={p} /></At>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
