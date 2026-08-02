import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

/**
 * A business-logic error a tool wants to report to the model/user - as
 * opposed to a bug. Thrown deliberately inside a tool handler and always
 * caught by `toToolResult`, never left to escape as a raw protocol error
 * (which would surface a stack trace to the client).
 */
export class ToolInputError extends Error {}

/**
 * Wraps a tool handler so every error - expected (`ToolInputError`,
 * `ZodError`) or not - becomes a clean `CallToolResult` with `isError:
 * true`, never a leaked stack trace. Tool logic can freely `throw` and rely
 * on this to translate it.
 */
export async function toToolResult(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    return { content: [{ type: "text", text: describeError(error) }], isError: true };
  }
}

function describeError(error: unknown): string {
  if (error instanceof ToolInputError) return error.message;
  if (isZodError(error)) {
    const first = error.issues[0];
    const path = first?.path?.join(".");
    return `That request didn't quite work: ${first?.message ?? "invalid input"}${path ? ` (${path})` : ""}.`;
  }
  return "Sorry, something went wrong on BiteJoy's side handling that request. Please try again.";
}

function isZodError(error: unknown): error is { issues: Array<{ message: string; path: (string | number)[] }> } {
  return typeof error === "object" && error !== null && "issues" in error && Array.isArray((error as { issues: unknown }).issues);
}
