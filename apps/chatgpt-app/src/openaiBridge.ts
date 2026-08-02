/**
 * Thin wrapper around the ChatGPT Apps SDK's `window.openai` host bridge.
 * Every call is feature-detected and safely no-ops (or falls back) when the
 * widget is running outside a real ChatGPT host - e.g. in `npm run dev`, or
 * on a host that hasn't implemented a given capability yet. This has not
 * been exercised against a live ChatGPT connection (see docs/chatgpt-app.md)
 * - the exact property names below are the best-documented convention as of
 * this build and are worth re-checking against developers.openai.com/apps-sdk
 * before shipping.
 */

export interface OpenAiHost {
  toolOutput?: unknown;
  toolResponseMetadata?: unknown;
  widgetState?: unknown;
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sendFollowUpMessage?: (args: { prompt: string }) => Promise<void> | void;
  setWidgetState?: (state: unknown) => Promise<void> | void;
}

declare global {
  interface Window {
    openai?: OpenAiHost;
  }
}

export function getHost(): OpenAiHost | undefined {
  return typeof window !== "undefined" ? window.openai : undefined;
}

/** Reads whatever the host handed this widget as the triggering tool's output. Tries the documented property names, in order. */
export function readToolOutput<T>(): T | undefined {
  const host = getHost();
  if (!host) return undefined;
  const value = host.toolOutput ?? host.toolResponseMetadata;
  return value as T | undefined;
}

export function isHostAvailable(): boolean {
  return Boolean(getHost());
}

export async function callHostTool(name: string, args: Record<string, unknown>): Promise<boolean> {
  const host = getHost();
  if (!host?.callTool) return false;
  await host.callTool(name, args);
  return true;
}

export function sendFollowUpMessage(prompt: string): boolean {
  const host = getHost();
  if (!host?.sendFollowUpMessage) return false;
  host.sendFollowUpMessage({ prompt });
  return true;
}

/** Always works, inside or outside ChatGPT - just opens a normal maps link. */
export function openDirections(location: { lat: number; lng: number }, label: string): void {
  const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}(${encodeURIComponent(label)})`;
  window.open(url, "_blank", "noopener,noreferrer");
}
