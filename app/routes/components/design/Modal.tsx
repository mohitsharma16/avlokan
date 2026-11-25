import React, { useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { EASE } from "../motion/motionVariants";
import { useModalHistory } from "../../hooks/useModalHistory";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  maxWidth?: number;
  children: React.ReactNode;
}

/** Shared modal shell: blurred scrim, controlled radius, Esc to close, focus moved into the dialog. */
export const Modal: React.FC<ModalProps> = ({ open, onClose, title, maxWidth = 560, children }) => {
  const panel = useRef<HTMLDivElement>(null);
  useModalHistory(open, onClose, useId());

  useEffect(() => {
    const dialog = panel.current;
    if (!open || !dialog) return;

    const opener = document.activeElement;
    dialog.focus();

    const cycleFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, [tabindex], [contenteditable=true]",
      )).filter((element) =>
        element.tabIndex >= 0 && !element.matches(":disabled") &&
        element.getClientRects().length > 0 && getComputedStyle(element).visibility === "visible"
      );
      const first = controls[0];
      const last = controls[controls.length - 1];
      const active = document.activeElement;
      if (!first || !dialog.contains(active) || active === dialog ||
          active === (event.shiftKey ? first : last)) {
        event.preventDefault();
        ((event.shiftKey ? last : first) ?? dialog).focus();
      }
    };
    document.addEventListener("keydown", cycleFocus);
    return () => {
      document.removeEventListener("keydown", cycleFocus);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: "var(--av-z-modal)" as any, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "rgba(5,5,7,0.62)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
        >
          <motion.div
            onKeyDown={(event) => { if (event.key === "Escape") onClose(); }}
            ref={panel} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}
            initial={{ opacity: 0, y: 12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.32, ease: EASE }}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth, maxHeight: "88vh", overflow: "auto", background: "var(--color-surface)", border: "1px solid var(--color-border-strong)", borderRadius: "var(--av-radius-lg)", boxShadow: "var(--av-shadow-deep)", outline: "none" }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
export default Modal;
