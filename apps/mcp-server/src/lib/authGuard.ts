import type { AppContext } from "../context.js";
import type { UserRepository } from "../repository/types.js";
import { ToolInputError } from "./errors.js";

/** The one user-facing message every private tool shows for "no/invalid token" - never a raw auth-library error. */
export const SIGN_IN_REQUIRED_MESSAGE = "This needs a connected BiteJoy account - please sign in and try again.";

/**
 * Every authenticated tool's first line: pulls the verified `userId` and a
 * ready-to-use `UserRepository` out of the per-request `AppContext`, or
 * throws the single friendly "please sign in" error (via `ToolInputError`,
 * so `toToolResult` renders it as a clean `isError: true` result, never a
 * raw exception) when there's no valid auth on this request.
 *
 * `ctx.auth`/`ctx.repository` are only ever populated from a token that
 * `auth/verifyAccessToken.ts` already verified - this function never sees,
 * and tool handlers must never accept, a caller-supplied user id.
 */
export function requireAuthedContext(ctx: AppContext): { userId: string; repository: UserRepository } {
  if (!ctx.auth || !ctx.repository) {
    throw new ToolInputError(SIGN_IN_REQUIRED_MESSAGE);
  }
  return { userId: ctx.auth.userId, repository: ctx.repository };
}
