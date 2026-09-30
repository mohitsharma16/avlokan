import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Arrow, ArrowDown } from "./icons";
import { ProductWindow } from "./ReviewScene";
import { EASE } from "../motion/motionVariants";
import { useCinematic, useStickyProgress } from "../motion/useScrollProgress";
import { MotionReveal } from "../motion/MotionReveal";

const Backdrop = () => (
  <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
    <div style={{ position: "absolute", left: "50%", top: "-10%", width: "90vw", height: "70vh", transform: "translateX(-50%)", background: "radial-gradient(ellipse at center, color-mix(in srgb, var(--color-accent) 16%, transparent) 0%, transparent 62%)" }} />
    <div className="av-grid-bg" style={{ position: "absolute", inset: 0, opacity: 0.55 }} />
  </div>
);

const Copy: React.FC<{ cinematic?: boolean }> = ({ cinematic }) => (
  <div style={{ textAlign: "center", maxWidth: 1100, margin: "0 auto", padding: "0 20px" }}>
    <motion.p className="av-eyebrow" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.1 }} style={{ marginBottom: 24 }}>
      Creative review · frame-accurate
    </motion.p>
    <h1 className="av-display" style={{ margin: 0, fontSize: cinematic ? "clamp(52px, min(8vw, 11.5vh), 112px)" : undefined }}>
      {["Creative feedback.", "Finally in focus."].map((line, i) => (
        <span key={line} style={{ display: "block", overflow: "hidden", paddingBottom: "0.08em" }}>
          <motion.span
            initial={{ y: "105%" }} animate={{ y: 0 }} transition={{ duration: 1, delay: 0.15 + i * 0.12, ease: EASE }}
            style={{ display: "block", color: i === 1 ? "var(--color-text-secondary)" : undefined }}
          >{line}</motion.span>
        </span>
      ))}
    </h1>
    <motion.p className="av-lede" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.55, ease: EASE }} style={{ maxWidth: 560, margin: "28px auto 0" }}>
      Avlokan brings annotations, conversations, revisions and approvals into one visual review workflow.
    </motion.p>
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.7, ease: EASE }} style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center", marginTop: 32 }}>
      <Link to="/app" className="av-btn av-btn-primary av-btn-lg">Start Reviewing <Arrow width={16} height={16} /></Link>
      <a href="#story" className="av-btn av-btn-ghost av-btn-lg">See how it works <ArrowDown width={16} height={16} /></a>
    </motion.div>
  </div>
);

/** Cinematic: headline recedes, the product surface rises, grows and fills the viewport. */
const CinematicHero: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const t = useStickyProgress(ref);

  const headOpacity = useTransform(t, [0, 0.16], [1, 0], { clamp: true });
  const headY = useTransform(t, [0, 0.2], [0, -90], { clamp: true });
  const headScale = useTransform(t, [0, 0.2], [1, 0.95], { clamp: true });

  const stageY = useTransform(t, [0, 0.3, 0.75], ["73vh", "13vh", "3vh"], { clamp: true });
  const stageScale = useTransform(t, [0, 0.3, 0.75, 1], [0.86, 1, 1.16, 1.28], { clamp: true });
  const stageRotate = useTransform(t, [0, 0.3], [9, 0], { clamp: true });
  const stageRadius = useTransform(t, [0, 0.75], [28, 6], { clamp: true });
  const stageOpacity = useTransform(t, [0.8, 0.97], [1, 0], { clamp: true });

  // The product itself "plays" as it scrolls: the annotation draws and the AI review runs.
  const pMain = useTransform(t, [0.05, 0.55], [0.02, 0.5], { clamp: true });
  const pAI = useTransform(t, [0.3, 0.75], [0.72, 0.88], { clamp: true });

  return (
    <section id="product" ref={ref} style={{ position: "relative", height: "300vh" }}>
      <div style={{ position: "sticky", top: 0, height: "100vh", overflow: "hidden", perspective: 1600 }}>
        <Backdrop />
        <motion.div style={{ position: "absolute", left: 0, right: 0, top: "13vh", opacity: headOpacity, y: headY, scale: headScale }}>
          <Copy cinematic />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2, delay: 0.5 }}
          style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", justifyContent: "center", pointerEvents: "none" }}
        >
          <motion.div
            style={{ width: "min(1180px, 92vw)", y: stageY, scale: stageScale, rotateX: stageRotate, borderRadius: stageRadius, opacity: stageOpacity, transformOrigin: "50% 0%", willChange: "transform" }}
          >
            <ProductWindow p={pMain} pAI={pAI} variant="hero" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

/** Simple: normal flow, gentle reveal — used on mobile, tablet and with reduced motion. */
const SimpleHero: React.FC = () => {
  const pMain = useMotionValue(0.5);
  const pAI = useMotionValue(0.88);
  return (
    <section id="product" style={{ position: "relative", padding: "128px 0 72px" }}>
      <Backdrop />
      <div style={{ position: "relative" }}>
        <Copy />
        <MotionReveal kind="scale" style={{ position: "relative", margin: "56px auto 0", width: "min(960px, calc(100% - 32px))", borderRadius: "var(--av-radius-lg)" }}>
          <ProductWindow p={pMain} pAI={pAI} variant="hero" />
        </MotionReveal>
      </div>
    </section>
  );
};

export const HeroSection: React.FC = () => (useCinematic() ? <CinematicHero /> : <SimpleHero />);
export default HeroSection;
