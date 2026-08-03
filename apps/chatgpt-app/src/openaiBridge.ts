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

export interface HostToolCallResult {
  /** Whether the host actually exposed `callTool` and we invoked it at all. */
  called: boolean;
  /** True only if the host was called AND the result wasn't `isError: true`. */
  ok: boolean;
  result?: unknown;
}

/**
 * Like `callHostTool`, but also surfaces whether the call actually
 * succeeded - needed for flows (like Save) that must roll back optimistic
 * UI on failure rather than just reporting "did we manage to invoke the
 * host at all".
 *
 * The Apps SDK doesn't document a way for a widget to check "is this
 * ChatGPT user authenticated with BiteJoy" up front (see docs/chatgpt-app.md
 * and this file's header comment - this whole area is new/unverified). The
 * convention the Stage 3 MCP tool contract uses instead: an
 * authenticated-only tool call (save/remove/list saved restaurants) fails
 * for an unauthenticated caller with a clean `isError: true` result rather
 * than throwing. So any `isError: true` result - or an outright host
 * error, or no host/`callTool` being available at all - is treated the
 * same way here: "couldn't complete this," letting the caller roll back
 * and show a connect-account prompt instead of a false "success".
 */
export async function callHostToolDetailed(name: string, args: Record<string, unknown>): Promise<HostToolCallResult> {
  const host = getHost();
  if (!host?.callTool) return { called: false, ok: false };
  try {
    const result = await host.callTool(name, args);
    const isError = Boolean((result as { isError?: boolean } | null | undefined)?.isError);
    return { called: true, ok: !isError, result };
  } catch {
    return { called: true, ok: false };
  }
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
