import * as React from "react";
import { cn } from "../../lib/cn";

export type BadgeVariant = "neutral" | "accent" | "secondary" | "success" | "warn" | "danger";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  /** Small solid dot before the label — for status pills like "Open now" / "Closes soon". */
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  neutral: "bg-bg text-muted border border-border",
  accent: "bg-accent-soft text-accent-strong border border-transparent",
  secondary: "bg-secondary-soft text-secondary-strong border border-transparent",
  success: "bg-success-soft text-success border border-transparent",
  warn: "bg-warn-soft text-warn border border-transparent",
  danger: "bg-danger-soft text-danger border border-transparent",
};

export function Badge({ variant = "neutral", dot, className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold",
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
