import React from "react";
import { motion } from "framer-motion";
import { stagger, fadeRise, fade, viewportOnce } from "./motionVariants";
import { useReducedMotion } from "./useReducedMotion";

/** Staggers direct <MotionStagger.Item> children when scrolled into view. */
export const MotionStagger = ({ gap = 0.09, delay = 0, children, ...rest }: { gap?: number; delay?: number } & Omit<React.ComponentProps<typeof motion.div>, "variants">) => (
  <motion.div variants={stagger(gap, delay)} initial="hidden" whileInView="visible" viewport={viewportOnce} {...rest}>
    {children}
  </motion.div>
);

const Item = ({ children, ...rest }: Omit<React.ComponentProps<typeof motion.div>, "variants">) => {
  const reduce = useReducedMotion();
  return <motion.div variants={reduce ? fade : fadeRise(24)} {...rest}>{children}</motion.div>;
};
MotionStagger.Item = Item;
export default MotionStagger;
