import * as React from "react";
import { cn } from "../../lib/cn";

export interface FormFieldProps {
  /** Also used to derive the label's htmlFor and the helper/error text ids. */
  id: string;
  label: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  className?: string;
  /** A single form control (Input, Textarea, ...). id/aria-* are wired up automatically. */
  children: React.ReactElement;
}

/**
 * Wraps a single form control with a label and helper/error text, wiring
 * up id / aria-describedby / aria-invalid so every field in the app gets
 * the same accessible plumbing without repeating it by hand.
 *
 * `children` is typed loosely (cloneElement target) on purpose: it accepts
 * any of Input/Textarea/Select-shaped controls without fighting their
 * individual prop types.
 */
export function FormField({ id, label, helperText, errorText, required, className, children }: FormFieldProps) {
  const describedBy = errorText ? `${id}-error` : helperText ? `${id}-helper` : undefined;

  const control = React.cloneElement(children as React.ReactElement<any>, {
    id,
    "aria-invalid": errorText ? true : undefined,
    "aria-describedby": describedBy,
    "aria-required": required || undefined,
  });

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-sm font-medium text-text">
        {label}
        {required && (
          <span className="ml-0.5 text-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {control}
      {errorText ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-danger">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={`${id}-helper`} className="text-sm text-muted">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
