import React, { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import { Clock, Lock, LinkIcon } from "./icons";
import { MotionReveal } from "../motion/MotionReveal";
import { useSectionProgress } from "../motion/useScrollProgress";

/** Layered text states that crossfade as the link "ages". */
const State: React.FC<{ q: ReturnType<typeof useSectionProgress>; pts: number[]; vals: number[]; children: React.ReactNode }> = ({ q, pts, vals, children }) => {
  const opacity = useTransform(q, pts, vals, { clamp: true });
  return <motion.span style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", opacity }}>{children}</motion.span>;
};

export const SharingScene: React.FC = () => {
  const ref = useRef<HTMLElement>(null);
  const q = useSectionProgress(ref);

  const bar = useTransform(q, [0.42, 0.72], ["100%", "0%"], { clamp: true });
  const barColor = useTransform(q, [0.42, 0.58, 0.72], ["#FF6B4A", "#F4C95D", "#FF5C5C"], { clamp: true });
  const urlOpacity = useTransform(q, [0.68, 0.74], [1, 0.35], { clamp: true });
  const veil = useTransform(q, [0.7, 0.76], [0, 1], { clamp: true });

  return (
    <section ref={ref} aria-label="Controlled sharing" style={{ padding: "clamp(96px, 14vw, 200px) 20px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 56, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", alignItems: "center" }}>
        <div>
          <MotionReveal as="p" className="av-eyebrow" style={{ marginBottom: 16, color: "var(--color-accent-text)" }}>Controlled sharing</MotionReveal>
          <MotionReveal as="h2" className="av-h2" style={{ margin: 0, fontSize: "clamp(38px, 4.6vw, 64px)" }}>Share the review. Not the whole workspace.</MotionReveal>
          <MotionReveal delay={0.1} className="av-lede" style={{ marginTop: 20, maxWidth: 460 }}>
            Send reviewers a link to a single revision. Each link is tied to the reviewer's email and expires on its own — enforced on the server, not in the URL.
          </MotionReveal>
        </div>

        <MotionReveal kind="scale">
          <div className="av-surface" style={{ padding: 20, borderRadius: "var(--av-radius-lg)", background: "var(--color-surface)", boxShadow: "var(--av-shadow-soft)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--color-text-secondary)", display: "inline-flex" }}><LinkIcon width={18} height={18} /></span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>Review link</span>
              <span style={{ marginLeft: "auto", position: "relative", width: 76, height: 22 }}>
                <State q={q} pts={[0.68, 0.74]} vals={[1, 0]}><span className="av-badge" data-status="resolved">Active</span></State>
                <State q={q} pts={[0.68, 0.74]} vals={[0, 1]}><span className="av-badge" style={{ color: "var(--color-danger)", background: "color-mix(in srgb, var(--color-danger) 10%, transparent)", borderColor: "color-mix(in srgb, var(--color-danger) 30%, transparent)" }}>Expired</span></State>
              </span>
            </div>

            <motion.div className="av-mono" style={{ margin: "16px 0", padding: "11px 14px", borderRadius: "var(--av-radius-sm)", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", fontSize: 12.5, color: "var(--color-text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", opacity: urlOpacity }}>
              /revision/8f2a41c9?token=••••••••-••••-••••
            </motion.div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 22px", fontSize: 13.5, color: "var(--color-text-secondary)" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Clock width={15} height={15} />
                <span style={{ position: "relative", display: "inline-block", width: 132, height: 18 }}>
                  <State q={q} pts={[0.46, 0.52]} vals={[1, 0]}>Expires in 1 hour</State>
                  <State q={q} pts={[0.46, 0.52, 0.68, 0.74]} vals={[0, 1, 1, 0]}>Expires in 5 minutes</State>
                  <State q={q} pts={[0.68, 0.74]} vals={[0, 1]}><span style={{ color: "var(--color-danger)" }}>Link expired</span></State>
                </span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Lock width={15} height={15} />Reviewer email required</span>
            </div>

            <div style={{ height: 4, borderRadius: 4, marginTop: 16, background: "var(--color-bg-tertiary)", overflow: "hidden" }}>
              <motion.div style={{ height: "100%", width: bar, background: barColor }} />
            </div>

            {/* what the reviewer sees */}
            <div style={{ position: "relative", marginTop: 20, padding: 14, borderRadius: "var(--av-radius-md)", border: "1px solid var(--color-border)", background: "var(--color-bg-secondary)", overflow: "hidden" }}>
              <p className="av-eyebrow" style={{ fontSize: 10.5, margin: 0 }}>Reviewer sees</p>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 10 }}>
                <span aria-hidden style={{ width: 64, aspectRatio: "16/9", borderRadius: 6, background: "linear-gradient(165deg,#1b272d,#4a3d38 50%,#b9835c)" }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Spring Spot · R02</div>
                  <div style={{ fontSize: 12.5, color: "var(--color-text-tertiary)" }}>One revision. Nothing else in the workspace.</div>
                </div>
              </div>
              <motion.div style={{ position: "absolute", inset: 0, opacity: veil, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, textAlign: "center", fontSize: 13, color: "var(--color-text-primary)", background: "color-mix(in srgb, var(--color-bg-secondary) 92%, transparent)", backdropFilter: "blur(3px)" }}>
                This share link is invalid or has expired.
              </motion.div>
            </div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
};
export default SharingScene;
