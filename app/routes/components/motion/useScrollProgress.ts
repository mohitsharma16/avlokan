import { useEffect, useState, type RefObject } from "react";
import { animate, useMotionValue, useInView, useScroll, useTransform, type MotionValue } from "framer-motion";
import { useReducedMotion } from "./useReducedMotion";

/** Normalised 0→1 progress through a section that is taller than the viewport
 *  (sticky storytelling): 0 when its top hits the viewport top, 1 when its bottom hits the viewport bottom. */
export function useStickyProgress(ref: RefObject<HTMLElement | null>) {
  return useScroll({ target: ref, offset: ["start start", "end end"] }).scrollYProgress;
}

/** Progress while a section travels through the viewport (enter → leave). */
export function useSectionProgress(ref: RefObject<HTMLElement | null>) {
  return useScroll({ target: ref, offset: ["start end", "end start"] }).scrollYProgress;
}

/** Clamped range mapping: progress in [a, b] → [from, to]. */
export function useRange(
  progress: MotionValue<number>,
  [a, b]: [number, number],
  [from, to]: [number, number] | [string, string] | [number, number] = [0, 1] as [number, number],
) {
  return useTransform(progress, [a, b], [from as number, to as number], { clamp: true });
}

/** Wide/tall scroll choreography only on desktop-class viewports without reduced-motion.
 *  Returns `false` during SSR so the simple layout is what first paints. */
export function useCinematic() {
  const reduce = useReducedMotion();
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (min-height: 600px)");
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return wide && !reduce;
}

/** For non-sticky layouts: when `ref` scrolls into view, play a motion value from `from` → `to`.
 *  Lets the same scroll-driven scene run as a short auto-playing sequence on mobile. */
export function useAutoProgress(ref: RefObject<HTMLElement | null>, from: number, to: number, seconds = 3.2) {
  const value = useMotionValue(from);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      value.set(to);
      return;
    }
    const controls = animate(value, to, { duration: seconds, ease: "linear" });
    return () => controls.stop();
  }, [inView, reduce, from, to, seconds, value]);
  return value;
}
