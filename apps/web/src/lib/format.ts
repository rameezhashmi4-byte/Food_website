/** "brunch_cafe" -> "Brunch cafe". Used to render @bitejoy/core's enum tokens as friendly labels. */
export function humanizeToken(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
