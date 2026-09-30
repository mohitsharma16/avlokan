import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useNotifications } from "../../hooks/useNotifications";
import type { Notification } from "../../types";
import { Mark } from "../landing/icons";
import { IconButton } from "../design";
import { EASE } from "../motion/motionVariants";

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const iconProps = { width: 17, height: 17, fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" } as const;

interface HeaderProps {
  /** Where the user is: e.g. ["Northwind", "Spring campaign", "Hero spot"]. Rendered as a breadcrumb. */
  context?: string[];
}

const Header: React.FC<HeaderProps> = ({ context = [] }) => {
  const { pb, user, logout } = useAuth();
  const { toggleTheme, isDark } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications({ pb, userId: user?.id ?? null });

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click / Escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);
  };

  const initial = ((user?.name as string) || (user?.email as string) || "?").trim()[0]?.toUpperCase();

  return (
    <header
      style={{
        position: "sticky", top: 0, zIndex: "var(--av-z-header)" as any,
        backdropFilter: "blur(14px) saturate(140%)", WebkitBackdropFilter: "blur(14px) saturate(140%)",
        background: "color-mix(in srgb, var(--color-bg) 82%, transparent)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
        <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--color-text-primary)", textDecoration: "none", fontWeight: 650, fontSize: 16, letterSpacing: "-0.03em" }}>
          <Mark size={20} /> Avlokan
        </Link>

        {context.length > 0 && (
          <nav aria-label="Breadcrumb" className="av-crumbs" style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontSize: 13.5, color: "var(--color-text-tertiary)" }}>
            {context.map((c, i) => (
              <React.Fragment key={`${c}-${i}`}>
                <span aria-hidden>/</span>
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: i === context.length - 1 ? "var(--color-text-primary)" : undefined }}>{c}</span>
              </React.Fragment>
            ))}
          </nav>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton label={isDark ? "Switch to light mode" : "Switch to dark mode"} onClick={toggleTheme}>
            {isDark ? (
              <svg {...iconProps}><circle cx="12" cy="12" r="4" /><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1 1M17.4 17.4l1 1M18.4 5.6l-1 1M6.6 17.4l-1 1" /></svg>
            ) : (
              <svg {...iconProps}><path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z" /></svg>
            )}
          </IconButton>

          <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)} id="notification-bell" className="av-btn av-btn-icon" data-tip="Notifications"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"} aria-expanded={isOpen} aria-haspopup="true"
            >
              <svg {...iconProps}><path d="M6 9a6 6 0 1112 0c0 5 2 6.5 2 6.5H4S6 14 6 9zM10 19a2 2 0 004 0" /></svg>
              {unreadCount > 0 && (
                <span aria-hidden style={{ position: "absolute", top: -3, right: -3, minWidth: 14, height: 14, padding: "0 3px", borderRadius: 8, background: "var(--color-accent)", color: "var(--color-accent-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, border: "2px solid var(--color-bg)", boxSizing: "content-box" }}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 340, maxWidth: "calc(100vw - 32px)", background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "var(--av-radius-lg)", boxShadow: "var(--av-shadow-deep)", overflow: "hidden", zIndex: "var(--av-z-dropdown)" as any, transformOrigin: "top right" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllAsRead} className="av-btn av-btn-ghost av-btn-sm" style={{ color: "var(--color-accent-text)" }}>Mark all as read</button>
                    )}
                  </div>
                  <div style={{ maxHeight: 360, overflowY: "auto" }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--color-text-tertiary)", fontSize: 13 }}>
                        You're all caught up.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <button
                          key={n.id} onClick={() => handleNotificationClick(n)}
                          style={{ display: "flex", width: "100%", gap: 10, alignItems: "flex-start", textAlign: "left", padding: "12px 16px", border: 0, borderBottom: "1px solid var(--color-border)", cursor: "pointer", font: "inherit", color: "inherit", background: !n.read ? "color-mix(in srgb, var(--color-accent) 6%, transparent)" : "transparent", transition: "background var(--av-motion-fast) ease" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "var(--color-bg-tertiary)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = !n.read ? "color-mix(in srgb, var(--color-accent) 6%, transparent)" : "transparent")}
                        >
                          <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", marginTop: 7, flexShrink: 0, background: !n.read ? "var(--color-accent)" : "transparent" }} />
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 13, lineHeight: 1.4, fontWeight: !n.read ? 550 : 400, color: !n.read ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>{n.message}</span>
                            <span className="av-mono" style={{ display: "block", fontSize: 10.5, color: "var(--color-text-tertiary)", marginTop: 4 }}>{timeAgo(n.created)}</span>
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <span style={{ width: 1, height: 20, background: "var(--color-border-strong)", margin: "0 8px" }} aria-hidden />

          <button
            onClick={logout} className="av-btn av-btn-ghost av-btn-sm"
            aria-label={`Sign out${user?.email ? ` (${user.email})` : ""}`} style={{ gap: 8, padding: "0 8px 0 4px" }}
          >
            <span aria-hidden style={{ width: 24, height: 24, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-tertiary)", border: "1px solid var(--color-border-strong)", fontSize: 11, fontWeight: 650, color: "var(--color-text-primary)" }}>{initial}</span>
            <span className="av-signout-label">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
