export const handle = { public: true };

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { Route } from "./+types/landing";
import { useTheme } from "../contexts/ThemeContext";

export const meta: Route.MetaFunction = () => [
  { title: "Avlokan — Creative review, finally in focus" },
  {
    name: "description",
    content:
      "Avlokan is where creative teams review work — frame-accurate annotation, timestamped feedback, direct task assignment, and gated share links. Built for freelancers, agencies, and in-house creative teams.",
  },
  { property: "og:title", content: "Avlokan — Creative review, finally in focus" },
  {
    property: "og:description",
    content:
      "Annotate the exact frame, assign the fix, keep every revision in one place. No more feedback scattered across Drive links and Slack threads.",
  },
  { property: "og:type", content: "website" },
  { name: "twitter:card", content: "summary_large_image" },
];

// ── Icons (inline outline SVGs, matching Header.tsx / AnnotationToolbar.tsx style) ──

const iconProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const PenIcon = () => <svg {...iconProps}><path d="M4 20l4-1 10-10a2.121 2.121 0 00-3-3L5 16l-1 4z" /></svg>;
const CommentIcon = () => <svg {...iconProps}><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>;
const LockIcon = () => <svg {...iconProps}><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
const LayersIcon = () => <svg {...iconProps}><path d="M12 3l9 5-9 5-9-5 9-5z" /><path d="M3 13l9 5 9-5" /></svg>;
const SparkleIcon = () => <svg {...iconProps}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>;
const CheckIcon = () => <svg {...iconProps} width={16} height={16}><path d="M4 12.5l4.5 4.5L20 6" /></svg>;
const CrossIcon = () => <svg {...iconProps} width={16} height={16} stroke="var(--danger)"><path d="M6 18L18 6M6 6l12 12" /></svg>;
const SunIcon = () => <svg {...iconProps} width={17} height={17}><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;
const MoonIcon = () => <svg {...iconProps} width={17} height={17}><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>;

// ── Motion helpers ────────────────────────────────────────────────────────────

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; style?: React.CSSProperties; className?: string }> = ({
  children,
  delay = 0,
  style,
  className,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 28 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-80px" }}
    transition={{ duration: 0.65, delay, ease: [0.3, 0, 0, 1] as const }}
    style={style}
    className={className}
  >
    {children}
  </motion.div>
);

const heroContainerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const heroItemVariants = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.3, 0, 0, 1] as const } },
};

// ── Page sections ──────────────────────────────────────────────────────────────

const Nav: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        background: scrolled ? "var(--surface)" : "transparent",
        backdropFilter: scrolled ? "blur(20px) saturate(1.8)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.8)" : "none",
        borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
        transition: "var(--transition)",
        fontFamily: "var(--font-apple)",
      }}
    >
      <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
        Avlokan
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to light mode" : "Switch to dark mode"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 34,
            height: 34,
            borderRadius: "999px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <Link to="/app" className="apple-btn-primary" style={{ fontSize: 14, padding: "9px 18px" }}>
          Sign In
        </Link>
      </div>
    </header>
  );
};

const ProductPreview: React.FC = () => (
  <motion.div
    variants={heroItemVariants}
    animate={{ y: [0, -10, 0] }}
    transition={{ y: { duration: 5, repeat: Infinity, ease: "easeInOut" } }}
    style={{
      position: "relative",
      width: "100%",
      maxWidth: 560,
      margin: "0 auto",
      borderRadius: "var(--radius-xl)",
      background: "var(--bg-elevated)",
      border: "1px solid var(--border)",
      boxShadow: "var(--shadow-modal)",
      padding: 10,
    }}
  >
    {/* Video frame */}
    <div
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: "var(--radius-lg)",
        background: "linear-gradient(135deg, #1c1c1e, #000)",
        overflow: "hidden",
      }}
    >
      {/* Play glyph */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "999px",
            background: "rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
        </div>
      </div>

      {/* Annotation marks */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 400 225"
        fill="none"
      >
        <circle cx="120" cy="70" r="26" stroke="#FF3B30" strokeWidth="2.5" />
        <path d="M255 150L310 100M310 100H285M310 100V125" stroke="#FFCC00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      {/* Timeline scrubber */}
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 10, height: 3, borderRadius: 2, background: "rgba(255,255,255,0.25)" }}>
        <div style={{ width: "38%", height: "100%", borderRadius: 2, background: "var(--accent-dark, #2997FF)" }} />
      </div>
    </div>

    {/* Floating timestamped comment */}
    <motion.div
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
      style={{
        position: "absolute",
        right: -18,
        bottom: 28,
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px 8px 8px",
        borderRadius: "var(--radius-pill)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-hover)",
        maxWidth: 220,
      }}
    >
      <div style={{ width: 22, height: 22, borderRadius: "999px", background: "var(--accent)", color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        RS
      </div>
      <div>
        <div style={{ fontSize: 10, color: "var(--text-tertiary)", fontFamily: "ui-monospace, monospace" }}>0:42</div>
        <div style={{ fontSize: 11.5, color: "var(--text-primary)", lineHeight: 1.3 }}>Fix the logo contrast here</div>
      </div>
    </motion.div>

    {/* Floating tool badge */}
    <motion.div
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
      style={{
        position: "absolute",
        left: -14,
        top: 26,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 10px",
        borderRadius: "var(--radius-md)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-hover)",
        color: "var(--accent)",
      }}
    >
      <PenIcon />
      <span style={{ fontSize: 11.5, fontWeight: 500, color: "var(--text-primary)" }}>Annotating</span>
    </motion.div>
  </motion.div>
);

const Hero: React.FC = () => (
  <section
    style={{
      position: "relative",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "140px 24px 80px",
      overflow: "hidden",
    }}
  >
    {/* Ambient glow */}
    <div
      aria-hidden
      style={{
        position: "absolute",
        top: "-20%",
        left: "50%",
        transform: "translateX(-50%)",
        width: 900,
        height: 600,
        background: "radial-gradient(circle, rgba(0,113,227,0.16), transparent 65%)",
        pointerEvents: "none",
        zIndex: 0,
      }}
    />

    <motion.div
      variants={heroContainerVariants}
      initial="hidden"
      animate="show"
      style={{ position: "relative", zIndex: 1, maxWidth: 780, textAlign: "center", fontFamily: "var(--font-apple)" }}
    >
      <motion.span
        variants={heroItemVariants}
        style={{
          display: "inline-block",
          fontSize: 12.5,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--accent)",
          background: "rgba(0, 113, 227, 0.1)",
          padding: "6px 14px",
          borderRadius: "var(--radius-pill)",
          marginBottom: 20,
        }}
      >
        Built for creative teams
      </motion.span>

      <motion.h1
        variants={heroItemVariants}
        style={{
          fontSize: "clamp(36px, 6vw, 64px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          lineHeight: 1.05,
          color: "var(--text-primary)",
          margin: "0 0 20px",
        }}
      >
        Creative feedback,
        <br />
        finally in focus.
      </motion.h1>

      <motion.p
        variants={heroItemVariants}
        style={{
          fontSize: "clamp(16px, 2vw, 19px)",
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          maxWidth: 560,
          margin: "0 auto 36px",
        }}
      >
        Avlokan turns scattered Drive links and buried comments into one frame-accurate
        review. Annotate the exact moment, assign the fix, and keep every revision in
        one place.
      </motion.p>

      <motion.div variants={heroItemVariants} style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <Link to="/app" className="apple-btn-primary" style={{ fontSize: 15.5, padding: "12px 26px" }}>
          Start Reviewing
        </Link>
        <a href="#features" className="apple-btn-secondary" style={{ fontSize: 15.5, padding: "12px 26px" }}>
          See how it works
        </a>
      </motion.div>
    </motion.div>

    <motion.div variants={heroContainerVariants} initial="hidden" animate="show" style={{ position: "relative", zIndex: 1, marginTop: 72, width: "100%" }}>
      <ProductPreview />
    </motion.div>
  </section>
);

const StorySection: React.FC = () => (
  <section id="story" style={{ padding: "100px 24px", background: "var(--bg-elevated)" }}>
    <div style={{ maxWidth: 720, margin: "0 auto", fontFamily: "var(--font-apple)" }}>
      <Reveal>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)" }}>
          Why we built this
        </span>
      </Reveal>
      <Reveal delay={0.08}>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "12px 0 24px" }}>
          Avlokan started as a conversation, not a business plan.
        </h2>
      </Reveal>
      <Reveal delay={0.16}>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--text-secondary)", margin: "0 0 18px" }}>
          The idea came from Dinesh Salunke, a mentor at thob.studio, who wanted the
          internal team to have a real feedback loop when reviewing creative assets —
          not another chain of Drive comments and "did you see my message?" follow-ups.
        </p>
      </Reveal>
      <Reveal delay={0.24}>
        <p style={{ fontSize: 17, lineHeight: 1.75, color: "var(--text-secondary)", margin: 0 }}>
          The brief was direct: let reviewers annotate the actual video, mark exact
          timestamps, assign fixes to the right person, and share a link the production
          team could trust — without losing control of who sees it. That internal tool
          became Avlokan, built for anyone in the creative field whose work needs to be
          reviewed properly: freelancers, agencies, and in-house teams alike.
        </p>
      </Reveal>
    </div>
  </section>
);

interface Feature {
  Icon: React.FC;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  { Icon: PenIcon, title: "Frame-accurate annotation", description: "Draw directly on the video — pen, shapes, arrows, highlights — pinned to the exact frame it's about." },
  { Icon: CommentIcon, title: "Timestamped, threaded feedback", description: "Comments live next to the moment they describe, not buried three scrolls down a chat thread." },
  { Icon: LockIcon, title: "Gated, expiring share links", description: "Reviewers get a controlled link with a real expiry — not an open Drive link anyone can forward on." },
  { Icon: LayersIcon, title: "Revision history & compare", description: "Every cut lives in one place. Compare versions side-by-side instead of guessing which file is final." },
  { Icon: SparkleIcon, title: "AI-assisted first pass", description: "An automatic review flags typography, contrast, layout, and accessibility issues before a human looks." },
  { Icon: CheckIcon, title: "Direct task assignment", description: "Pull a teammate in and hand them the fix directly — feedback becomes action, not just a comment." },
];

const FeaturesSection: React.FC = () => (
  <section id="features" style={{ padding: "100px 24px", background: "var(--bg)" }}>
    <div style={{ maxWidth: 1080, margin: "0 auto", fontFamily: "var(--font-apple)" }}>
      <Reveal style={{ textAlign: "center", marginBottom: 56 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)" }}>
          What you get
        </span>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "12px 0 0" }}>
          Everything a review actually needs
        </h2>
      </Reveal>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.08}>
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.25 }}
              className="apple-card"
              style={{ padding: 26, height: "100%" }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "var(--radius-md)",
                  background: "rgba(0, 113, 227, 0.1)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <f.Icon />
              </div>
              <h3 style={{ fontSize: 16.5, fontWeight: 600, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.01em" }}>
                {f.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
                {f.description}
              </p>
            </motion.div>
          </Reveal>
        ))}
      </div>
    </div>
  </section>
);

const COMPARE_ROWS: { label: string; drive: boolean; avlokan: boolean }[] = [
  { label: "Access expires automatically", drive: false, avlokan: true },
  { label: "Feedback pinned to the exact frame", drive: false, avlokan: true },
  { label: "Fixes assigned directly to a person", drive: false, avlokan: true },
  { label: "One place for every revision", drive: false, avlokan: true },
  { label: "Anyone with the link can keep viewing it forever", drive: true, avlokan: false },
];

const CompareSection: React.FC = () => (
  <section style={{ padding: "100px 24px", background: "var(--bg-elevated)" }}>
    <div style={{ maxWidth: 640, margin: "0 auto", fontFamily: "var(--font-apple)" }}>
      <Reveal style={{ textAlign: "center", marginBottom: 40 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)" }}>
          The alternative
        </span>
        <h2 style={{ fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "12px 0 0" }}>
          Not another Drive link
        </h2>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="apple-card" style={{ overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 88px 88px", padding: "14px 20px", borderBottom: "1px solid var(--border)" }}>
            <span />
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textAlign: "center" }}>Drive link</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", textAlign: "center" }}>Avlokan</span>
          </div>
          {COMPARE_ROWS.map((row) => (
            <div
              key={row.label}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 88px 88px",
                alignItems: "center",
                padding: "14px 20px",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-primary)" }}>{row.label}</span>
              <span style={{ display: "flex", justifyContent: "center" }}>{row.drive ? <CheckIcon /> : <CrossIcon />}</span>
              <span style={{ display: "flex", justifyContent: "center" }}>{row.avlokan ? <CheckIcon /> : <CrossIcon />}</span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

const FinalCTA: React.FC = () => (
  <section style={{ padding: "120px 24px", textAlign: "center", fontFamily: "var(--font-apple)" }}>
    <Reveal>
      <h2 style={{ fontSize: "clamp(28px, 4.5vw, 42px)", fontWeight: 700, letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 16px" }}>
        Bring your next review into focus.
      </h2>
      <p style={{ fontSize: 16, color: "var(--text-secondary)", margin: "0 0 32px" }}>
        Free to start. No credit card, no Drive folder required.
      </p>
      <Link to="/app" className="apple-btn-primary" style={{ fontSize: 15.5, padding: "13px 30px" }}>
        Start Reviewing
      </Link>
    </Reveal>
  </section>
);

const Footer: React.FC = () => (
  <footer
    style={{
      padding: "28px 24px",
      textAlign: "center",
      borderTop: "1px solid var(--border)",
      fontFamily: "var(--font-apple)",
    }}
  >
    <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
      © {new Date().getFullYear()} Avlokan. Built for people who make things.
    </p>
  </footer>
);

export default function Landing() {
  return (
    <div style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <Nav />
      <Hero />
      <StorySection />
      <FeaturesSection />
      <CompareSection />
      <FinalCTA />
      <Footer />
    </div>
  );
}
