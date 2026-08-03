import { createRemoteJWKSet, errors as joseErrors, jwtVerify, type JWTVerifyGetKey } from "jose";
import { AuthError } from "./errors.js";

/**
 * The result of successfully verifying a BiteJoy (Supabase) access token.
 * `userId` is the Supabase `auth.users.id` (the JWT's `sub` claim) - the
 * only source of truth for "who is calling", never a value a tool takes
 * from its own input. `accessToken` is carried through (never logged,
 * never put in a tool result) purely so a per-request, per-user Supabase
 * client can be built for the repository layer - see
 * `repository/factory.ts`.
 */
export interface VerifiedAuth {
  userId: string;
  email?: string;
  accessToken: string;
}

export interface TokenVerifierConfig {
  /** Expected `iss` claim - the real Supabase project's `${SUPABASE_URL}/auth/v1`, or a test issuer. */
  issuer: string;
  /** Either `createRemoteJWKSet(new URL(...))` (production) or `createLocalJWKSet(jwks)` (tests - no network). */
  jwks: JWTVerifyGetKey;
}

export type TokenVerifier = (token: string | undefined) => Promise<VerifiedAuth>;

/**
 * Builds a standalone token verifier from an explicit issuer + JWKS key
 * source. Exported (rather than only exposing the env-driven default below)
 * so tests can point it at a local, offline JWKS built from a test-only key
 * pair instead of the real network endpoint.
 */
export function createTokenVerifier(config: TokenVerifierConfig): TokenVerifier {
  return async function verifyAccessToken(token) {
    if (!token) {
      throw new AuthError("missing_token", "No access token was provided.");
    }

    try {
      const { payload } = await jwtVerify(token, config.jwks, { issuer: config.issuer });

      const sub = payload.sub;
      if (!sub) {
        throw new AuthError("invalid_token", "Access token is missing a subject (sub) claim.");
      }

      const email = typeof payload.email === "string" ? payload.email : undefined;
      return { userId: sub, email, accessToken: token };
    } catch (error) {
      throw toAuthError(error);
    }
  };
}

/** Maps jose's specific verification failures onto our small, typed error-code surface. */
function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;

  if (error instanceof joseErrors.JWTExpired) {
    return new AuthError("expired_token", "Access token has expired.");
  }
  if (error instanceof joseErrors.JWTClaimValidationFailed && error.claim === "iss") {
    return new AuthError("wrong_issuer", "Access token was issued by an untrusted issuer.");
  }
  if (
    error instanceof joseErrors.JWSSignatureVerificationFailed ||
    error instanceof joseErrors.JWKSNoMatchingKey ||
    error instanceof joseErrors.JWSInvalid ||
    error instanceof joseErrors.JWTInvalid ||
    error instanceof joseErrors.JWTClaimValidationFailed
  ) {
    return new AuthError("invalid_token", "Access token could not be verified.");
  }
  return new AuthError("invalid_token", "Access token could not be verified.");
}

function supabaseTokenVerifierConfig(): TokenVerifierConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL must be set to verify BiteJoy access tokens (see .env.example).");
  }
  const base = supabaseUrl.replace(/\/+$/, "");
  // Verified live facts about this project (see repo notes): asymmetric
  // ES256 signing with a real JWKS at this well-known path, and full OIDC
  // discovery confirming `${SUPABASE_URL}/auth/v1` as the issuer.
  return {
    issuer: `${base}/auth/v1`,
    jwks: createRemoteJWKSet(new URL(`${base}/auth/v1/.well-known/jwks.json`)),
  };
}

let defaultVerifier: TokenVerifier | undefined;

/**
 * The production token verifier: real ES256 signature verification against
 * Supabase's live JWKS endpoint, real issuer check, real expiry check
 * (`jwtVerify` rejects an expired `exp` automatically). Extracts `sub` (the
 * Supabase user id) and never trusts anything else as the caller's
 * identity.
 *
 * Lazily builds its `createRemoteJWKSet` on first call (not at module load)
 * so merely importing this module never requires `SUPABASE_URL` to be set -
 * that keeps unrelated unit tests, and `createTokenVerifier`-based tests
 * using a local test JWKS, from needing Supabase env vars at all.
 */
export function verifyAccessToken(token: string | undefined): Promise<VerifiedAuth> {
  if (!defaultVerifier) {
    defaultVerifier = createTokenVerifier(supabaseTokenVerifierConfig());
  }
  return defaultVerifier(token);
}
