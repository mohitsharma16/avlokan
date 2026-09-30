import React from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface Common {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

const cls = (variant: Variant, size: Size, extra?: string) =>
  ["av-btn", `av-btn-${variant}`, size === "lg" && "av-btn-lg", size === "sm" && "av-btn-sm", extra].filter(Boolean).join(" ");

export const Button = React.forwardRef<HTMLButtonElement, Common & React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ variant = "primary", size = "md", className, children, type = "button", ...rest }, ref) => (
    <button ref={ref} type={type} className={cls(variant, size, className)} {...rest}>{children}</button>
  ),
);
Button.displayName = "Button";

/** Router link that looks like a button. */
export const ButtonLink: React.FC<Common & Omit<React.ComponentProps<typeof Link>, "className" | "children">> = ({
  variant = "primary", size = "md", className, children, ...rest
}) => <Link className={cls(variant, size, className)} {...rest}>{children}</Link>;

export default Button;
