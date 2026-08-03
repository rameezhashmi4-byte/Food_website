export type AuthErrorCode = "missing_token" | "invalid_token" | "expired_token" | "wrong_issuer";

/**
 * Thrown only by the token-verification pipeline (`verifyAccessToken` /
 * `createTokenVerifier`) - never anything downstream. Two callers catch it:
 *  - `http.ts`, to decide whether to set a `WWW-Authenticate` response
 *    header (see the Protected Resource Metadata notes there).
 *  - `lib/authGuard.ts`'s `requireAuthedContext`, which turns "there's no
 *    verified auth on this request" into the single user-facing "please
 *    sign in" tool error - callers must never surface `AuthError#message`
 *    (or any other auth-library error message) straight to the model/user;
 *    it can be diagnostic in server logs, nothing more.
 */
export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}
