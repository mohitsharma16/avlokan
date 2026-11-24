import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { Arrow, Close, Menu, Mark } from "./icons";
import { EASE } from "../motion/motionVariants";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Features", href: "#story" },
  { label: "AI", href: "#ai" },
  { label: "How it works", href: "#workflow" },
];

export const LandingNav: React.FC = () => {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 24));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: "var(--av-z-header)" as any, display: "flex", justifyContent: "center", padding: scrolled ? "10px 16px 0" : "18px 16px 0", transition: "padding 320ms var(--av-ease)" }}>
      <nav
        aria-label="Primary"
        style={{
          width: "100%", maxWidth: scrolled ? 860 : 1240, height: 52, display: "flex", alignItems: "center", gap: 8, padding: "0 8px 0 16px",
          borderRadius: "var(--av-radius-md)", border: "1px solid", borderColor: scrolled ? "var(--color-border-strong)" : "transparent",
          background: scrolled ? "color-mix(in srgb, var(--color-bg) 78%, transparent)" : "transparent",
          backdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none", WebkitBackdropFilter: scrolled ? "blur(14px) saturate(140%)" : "none",
          transition: "max-width 480ms var(--av-ease), background 240ms ease, border-color 240ms ease",
        }}
      >
        <Link to="/" aria-label="Avlokan home" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 650, fontSize: 17, letterSpacing: "-0.03em", marginRight: 12 }}>
          <Mark /> Avlokan
        </Link>

        <div className="av-nav-desktop" style={{ display: "none", gap: 2 }}>
          {LINKS.map((l) => <a key={l.href} href={l.href} className="av-nav-link">{l.label}</a>)}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <Link to="/app" className="av-btn av-btn-primary av-btn-sm av-nav-desktop-inline" style={{ display: "none" }}>Start Reviewing <Arrow width={14} height={14} /></Link>
          <button
            type="button" className="av-btn av-btn-icon av-nav-mobile-btn" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="av-mobile-menu"
            onClick={() => setOpen((o) => !o)} style={{ width: 44, height: 44 }}
          >{open ? <Close width={20} height={20} /> : <Menu width={20} height={20} />}</button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="av-mobile-menu" className="av-nav-mobile-panel"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.28, ease: EASE }}
            style={{ position: "absolute", top: "calc(100% + 6px)", left: 16, right: 16, padding: 8, borderRadius: "var(--av-radius-lg)", border: "1px solid var(--color-border-strong)", background: "color-mix(in srgb, var(--color-bg-secondary) 94%, transparent)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "var(--av-shadow-deep)" }}
          >
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="av-nav-link" style={{ display: "flex", alignItems: "center", minHeight: 48, fontSize: 17 }}>{l.label}</a>
            ))}
            <Link to="/app" onClick={() => setOpen(false)} className="av-btn av-btn-primary av-btn-lg" style={{ width: "100%", marginTop: 6 }}>Start Reviewing <Arrow width={16} height={16} /></Link>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 860px) {
          .av-nav-desktop { display: flex !important; }
          .av-nav-desktop-inline { display: inline-flex !important; }
          .av-nav-mobile-btn, .av-nav-mobile-panel { display: none !important; }
        }
      `}</style>
    </header>
  );
};
export default LandingNav;
