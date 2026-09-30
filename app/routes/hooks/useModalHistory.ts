import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * Ties an overlay (video review, modal, compare view…) to the browser history so the
 * Back button / swipe-back closes the overlay instead of leaving the page.
 *
 * Opening pushes one history entry (same URL, `state.avModal = key`). Back pops it and
 * calls `onClose`. Closing from the UI pops the entry we pushed, so history stays clean.
 */
export function useModalHistory(open: boolean, onClose: () => void, key: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const pushed = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    pushed.current = true;
    navigate(location.pathname + location.search + location.hash, { state: { avModal: key } });
    return () => {
      // Closed from the UI (not via Back): remove the entry we added.
      if (pushed.current) {
        pushed.current = false;
        if (window.history.state?.usr?.avModal === key) navigate(-1);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Back button: on a *location change*, if the entry no longer carries our key → close.
  // (Deliberately not keyed on `open`, or we would close in the same commit that opened.)
  const lastKey = useRef(location.key);
  useEffect(() => {
    if (lastKey.current === location.key) return;
    lastKey.current = location.key;
    if (pushed.current && (location.state as { avModal?: string } | null)?.avModal !== key) {
      pushed.current = false;
      closeRef.current();
    }
  }, [location, key]);
}
