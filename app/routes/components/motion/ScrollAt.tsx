import React from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";

type P = MotionValue<number>;

/** Opacity + small translate driven by a 0→1 progress value; optionally fades out again. The
 *  building block for scroll-linked scenes: state is transformed, never swapped. */
export const ScrollAt: React.FC<{
  p: P; a: number; b: number; out?: [number, number]; dy?: number; dx?: number; from?: number;
  style?: React.CSSProperties; className?: string; children?: React.ReactNode;
}> = ({ p, a, b, out, dy = 10, dx = 0, from = 1, style, className, children }) => {
  const opacity = useTransform(p, out ? [a, b, out[0], out[1]] : [a, b], out ? [0, 1, 1, 0] : [0, 1], { clamp: true });
  const y = useTransform(p, [a, b], [dy, 0], { clamp: true });
  const x = useTransform(p, [a, b], [dx, 0], { clamp: true });
  const scale = useTransform(p, [a, b], [from, 1], { clamp: true });
  return <motion.div className={className} style={{ ...style, opacity, y, x, scale }}>{children}</motion.div>;
};
