import React from "react";
import { motion } from "framer-motion";
import { fadeRise, fadeScale, fade, slideX, viewportOnce } from "./motionVariants";
import { useReducedMotion } from "./useReducedMotion";

type Kind = "rise" | "scale" | "fade" | "slide";

interface Props extends Omit<React.ComponentProps<typeof motion.div>, "variants" | "initial" | "whileInView"> {
  kind?: Kind;
  distance?: number;
  delay?: number;
  as?: "div" | "span" | "p" | "h1" | "h2" | "h3" | "li" | "section";
}

/** Viewport-triggered reveal. Under reduced motion only opacity animates. */
export const MotionReveal: React.FC<Props> = ({ kind = "rise", distance, delay = 0, as = "div", children, ...rest }) => {
  const reduce = useReducedMotion();
  const variants = reduce
    ? fade
    : kind === "scale" ? fadeScale
    : kind === "fade" ? fade
    : kind === "slide" ? slideX(distance ?? 48)
    : fadeRise(distance ?? 28);
  const Comp = motion[as] as typeof motion.div;
  return (
    <Comp variants={variants} initial="hidden" whileInView="visible" viewport={viewportOnce} transition={{ delay }} {...rest}>
      {children}
    </Comp>
  );
};
export default MotionReveal;
