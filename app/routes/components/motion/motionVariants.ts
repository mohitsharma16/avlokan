import type { Variants, Transition } from "framer-motion";

/** Avlokan's house easing — quick start, long soft landing. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const spring = { type: "spring", stiffness: 220, damping: 30, mass: 0.8 } as const;

export const viewportOnce = { once: true, margin: "0px 0px -12% 0px" } as const;

export const transition = (duration = 0.8, delay = 0): Transition => ({ duration, delay, ease: EASE });

/** Fade + rise. `distance` shrinks automatically under reduced motion (see MotionReveal). */
export const fadeRise = (distance = 28): Variants => ({
  hidden: { opacity: 0, y: distance },
  visible: { opacity: 1, y: 0, transition: transition(0.8) },
});

export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: transition(0.9) },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: transition(0.6) },
};

export const slideX = (distance = 48): Variants => ({
  hidden: { opacity: 0, x: distance },
  visible: { opacity: 1, x: 0, transition: transition(0.8) },
});

export const stagger = (gap = 0.09, delayChildren = 0): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: gap, delayChildren } },
});
