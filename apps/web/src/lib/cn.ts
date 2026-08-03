/**
 * Minimal className joiner. Deliberately dependency-free (no clsx /
 * tailwind-merge) so this component kit doesn't assume packages the rest
 * of apps/web hasn't installed yet.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
