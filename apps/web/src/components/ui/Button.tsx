"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  /**
   * primary = solid CTA (accent-strong bg), secondary = outlined,
   * ghost = text-only (tinted on hover), danger = destructive actions
   * (e.g. "Delete account").
   */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders as a Next.js <Link> instead of a <button> when provided. */
  href?: string;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3.5 gap-2.5",
};

// Primary/danger use a *solid* fill, so their label color must pass
// contrast against that fill in both color schemes — see --bj-on-solid in
// globals.css for why plain white text isn't safe here in dark mode.
const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-strong text-on-solid border border-accent-strong hover:brightness-95 active:brightness-90",
  secondary:
    "bg-surface text-text border border-border hover:border-accent hover:text-accent-strong",
  ghost:
    "bg-transparent text-text border border-transparent hover:bg-accent-soft hover:text-accent-strong",
  danger:
    "bg-danger text-on-solid border border-danger hover:brightness-95 active:brightness-90",
};

const base =
  "inline-flex items-center justify-center rounded-full font-semibold whitespace-nowrap transition-[background-color,border-color,color,filter] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:pointer-events-none";

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  );
}

/**
 * Note: when `href` is passed, Button renders a Next.js <Link> and only
 * `className`/`children`/icon props are applied to it — native <button>-only
 * attributes (e.g. `type`, `onClick`) are intentionally not forwarded to the
 * link branch, keeping this kit small. Use a plain <Link> directly if you
 * need a clickable link with button-specific handlers.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading,
    leftIcon,
    rightIcon,
    href,
    className,
    children,
    disabled,
    type = "button",
    ...rest
  },
  ref
) {
  const classes = cn(base, sizeClasses[size], variantClasses[variant], className);
  const content = (
    <>
      {isLoading ? <Spinner /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-disabled={disabled || isLoading || undefined}
        tabIndex={disabled ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {content}
    </button>
  );
});
