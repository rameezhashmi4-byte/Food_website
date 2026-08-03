"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { IconAlertTriangle, IconCheckCircle, IconInfo, IconX, IconXCircle } from "./icons";

export type AlertVariant = "success" | "info" | "warning" | "danger";

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  /** Renders a dismiss button when provided. */
  onDismiss?: () => void;
  className?: string;
}

const variantConfig: Record<AlertVariant, { classes: string; icon: React.ReactNode; role: "status" | "alert" }> = {
  success: {
    classes: "bg-success-soft text-success",
    icon: <IconCheckCircle width={18} height={18} />,
    role: "status",
  },
  info: {
    classes: "bg-accent-soft text-accent-strong",
    icon: <IconInfo width={18} height={18} />,
    role: "status",
  },
  warning: {
    classes: "bg-warn-soft text-warn",
    icon: <IconAlertTriangle width={18} height={18} />,
    role: "alert",
  },
  danger: {
    classes: "bg-danger-soft text-danger",
    icon: <IconXCircle width={18} height={18} />,
    role: "alert",
  },
};

/**
 * Inline banner for form/page feedback (success on save, validation error,
 * connection warning, ...). Not a floating/auto-dismissing toast — if a
 * timed popup is needed later, this is the right visual to reuse for it.
 */
export function Alert({ variant = "info", title, children, onDismiss, className }: AlertProps) {
  const config = variantConfig[variant];
  return (
    <div
      role={config.role}
      className={cn("flex items-start gap-3 rounded-bj-sm border border-transparent px-4 py-3 text-sm", config.classes, className)}
    >
      <span className="mt-0.5 flex-shrink-0">{config.icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5 opacity-90" : "opacity-90"}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="flex-shrink-0 rounded-full p-1 opacity-70 transition-opacity hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent dark:hover:bg-white/10"
        >
          <IconX width={14} height={14} />
        </button>
      )}
    </div>
  );
}
