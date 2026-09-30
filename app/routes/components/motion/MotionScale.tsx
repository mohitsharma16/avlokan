import React from "react";
import { MotionReveal } from "./MotionReveal";
export const MotionScale: React.FC<React.ComponentProps<typeof MotionReveal>> = (props) => <MotionReveal kind="scale" {...props} />;
export default MotionScale;
