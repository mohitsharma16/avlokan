import React from "react";
import { MotionReveal } from "./MotionReveal";
export const MotionFade: React.FC<React.ComponentProps<typeof MotionReveal>> = (props) => <MotionReveal kind="fade" {...props} />;
export default MotionFade;
