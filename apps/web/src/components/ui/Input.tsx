"use client";

import * as React from "react";
import { cn } from "../../lib/cn";

const fieldBase =
  "w-full rounded-bj-sm border bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:opacity-50 disabled:cursor-not-allowed";

function borderClasses(invalid?: boolean) {
  return invalid ? "border-danger focus:border-danger" : "border-border focus:border-accent";
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Applies the invalid/error border. Usually set automatically by FormField via aria-invalid. */
  invalid?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...rest },
  ref
) {
  const isInvalid = invalid ?? rest["aria-invalid"] === true;
  return <input ref={ref} className={cn(fieldBase, borderClasses(isInvalid), className)} {...rest} />;
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 4, ...rest },
  ref
) {
  const isInvalid = invalid ?? rest["aria-invalid"] === true;
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(fieldBase, "resize-y", borderClasses(isInvalid), className)}
      {...rest}
    />
  );
});
