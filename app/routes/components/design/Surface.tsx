import React from "react";

export const Surface: React.FC<React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }> = ({ interactive, className, ...rest }) => (
  <div className={["av-surface", interactive && "av-surface-interactive", className].filter(Boolean).join(" ")} {...rest} />
);
export default Surface;
