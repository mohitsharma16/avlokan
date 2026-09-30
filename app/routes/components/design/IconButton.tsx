import React from "react";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: icon-only controls need an accessible name; it also drives the tooltip. */
  label: string;
}

export const IconButton = React.forwardRef<HTMLButtonElement, Props>(({ label, className, children, type = "button", ...rest }, ref) => (
  <button ref={ref} type={type} aria-label={label} data-tip={label} className={["av-btn av-btn-icon", className].filter(Boolean).join(" ")} {...rest}>
    {children}
  </button>
));
IconButton.displayName = "IconButton";
export default IconButton;
