import { describe, expect, it, beforeAll } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JSONWebKeySet, type CryptoKey } from "jose";
import { createTokenVerifier, type TokenVerifier } from "../verifyAccessToken.js";
import { AuthError } from "../errors.js";

/**
 * Offline unit tests for the token-verification pipeline: a self-signed,
 * test-only ES256 key pair and a `createLocalJWKSet` (no network calls,
 * unlike the real `verifyAccessToken`'s `createRemoteJWKSet`). This proves
 * the verification LOGIC (signature, issuer, expiry, `sub` extraction,
 * error-code mapping) independent of the live Supabase project - see
 * verifyAccessToken.live.test.ts for the complementary check that the same
 * logic genuinely works against a real Supabase-issued token.
 */
describe("createTokenVerifier / verifyAccessToken", () => {
  const issuer = "https://test-project.supabase.co/auth/v1";
  const kid = "test-key-1";
  let verify: TokenVerifier;
  let signingKey: CryptoKey;
  let foreignKey: CryptoKey; // a key NOT in the verifier's JWKS, to prove a forged signature is rejected

  beforeAll(async () => {
    const pair = await generateKeyPair("ES256", { extractable: true });
    signingKey = pair.privateKey;
    const publicJwk = await exportJWK(pair.publicKey);
    publicJwk.kid = kid;
    publicJwk.alg = "ES256";
    publicJwk.use = "sig";
    const jwks: JSONWebKeySet = { keys: [publicJwk] };

    verify = createTokenVerifier({ issuer, jwks: createLocalJWKSet(jwks) });

    const foreignPair = await generateKeyPair("ES256", { extractable: true });
    foreignKey = foreignPair.privateKey;
  });

  async function sign(
    claims: Record<string, unknown>,
    opts?: { issuer?: string; expiresIn?: string; key?: CryptoKey; kid?: string },
  ): Promise<string> {
    return new SignJWT(claims)
      .setProtectedHeader({ alg: "ES256", kid: opts?.kid ?? kid })
      .setIssuedAt()
      .setIssuer(opts?.issuer ?? issuer)
      .setSubject(String(claims.sub ?? "user-1"))
      .setExpirationTime(opts?.expiresIn ?? "1h")
      .sign(opts?.key ?? signingKey);
  }

  it("accepts a validly signed, current, correctly-issued token and extracts userId/email from verified claims", async () => {
    const token = await sign({ sub: "11111111-1111-1111-1111-111111111111", email: "person@example.com" });
    const result = await verify(token);
    expect(result.userId).toBe("11111111-1111-1111-1111-111111111111");
    expect(result.email).toBe("person@example.com");
    expect(result.accessToken).toBe(token);
  });

  it("never trusts a userId that isn't the verified sub claim - email/other fields never override it", async () => {
    const token = await sign({ sub: "real-user", userId: "someone-else", email: "real@example.com" });
    const result = await verify(token);
    expect(result.userId).toBe("real-user");
  });

  it("rejects an expired token with code expired_token", async () => {
    const token = await sign({ sub: "user-1" }, { expiresIn: "-10s" });
    await expect(verify(token)).rejects.toBeInstanceOf(AuthError);
    await expect(verify(token)).rejects.toMatchObject({ code: "expired_token" });
  });

  it("rejects a token issued by the wrong issuer with code wrong_issuer", async () => {
    const token = await sign({ sub: "user-1" }, { issuer: "https://not-the-real-project.supabase.co/auth/v1" });
    await expect(verify(token)).rejects.toMatchObject({ code: "wrong_issuer" });
  });

  it("rejects a token with an invalid/forged signature with code invalid_token", async () => {
    // Same `kid` as our trusted key, but actually signed by a different,
    // untrusted private key - simulates a forged token, not just a typo.
    const token = await sign({ sub: "user-1" }, { key: foreignKey });
    await expect(verify(token)).rejects.toMatchObject({ code: "invalid_token" });
  });

  it("rejects a malformed (non-JWT) token string with code invalid_token", async () => {
    await expect(verify("this-is-not-a-jwt")).rejects.toMatchObject({ code: "invalid_token" });
  });

  it("rejects a missing token with code missing_token", async () => {
    await expect(verify(undefined)).rejects.toMatchObject({ code: "missing_token" });
  });
});
