import React from "react";
import { Link } from "react-router-dom";
import { Arrow } from "./icons";
import { MotionReveal } from "../motion/MotionReveal";

export const FinalCTA: React.FC = () => (
  <section aria-label="Get started" style={{ position: "relative", padding: "clamp(112px, 16vw, 240px) 20px", textAlign: "center", overflow: "hidden" }}>
    <div aria-hidden style={{ position: "absolute", left: "50%", top: "50%", width: "60vw", height: "40vh", transform: "translate(-50%,-50%)", background: "radial-gradient(ellipse, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 70%)" }} />
    <div style={{ position: "relative" }}>
      <MotionReveal as="h2" className="av-display" style={{ margin: 0, fontSize: "clamp(48px, 8vw, 104px)" }}>
        Stop chasing feedback.<br /><span style={{ color: "var(--color-text-secondary)" }}>Start reviewing.</span>
      </MotionReveal>
      <MotionReveal delay={0.12} style={{ marginTop: 40 }}>
        <Link to="/app" className="av-btn av-btn-primary av-btn-lg">Start Reviewing <Arrow width={16} height={16} /></Link>
      </MotionReveal>
      <MotionReveal delay={0.2} as="p" className="av-lede" style={{ marginTop: 24 }}>One review workspace for creative teams.</MotionReveal>
    </div>
  </section>
);
export default FinalCTA;
