import * as React from "react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";
import { IconBookmark } from "./icons";

export interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
}

/**
 * Friendly placeholder for "nothing here yet" states (e.g. no saved
 * restaurants, no connected apps). Renders as a Server Component; the
 * optional action buttons are still fully interactive because Button
 * itself is a Client Component ('use client'), so passing onClick here is
 * safe even without marking this file 'use client'.
 */
export function EmptyState({ icon, title, description, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-bj border border-dashed border-border bg-surface px-6 py-12 text-center",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
        {icon ?? <IconBookmark width={22} height={22} />}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-semibold text-text">{title}</h3>
        {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
      </div>
      {(action || secondaryAction) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button size="sm" href={action.href} onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button size="sm" variant="secondary" href={secondaryAction.href} onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
