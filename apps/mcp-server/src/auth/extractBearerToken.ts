/**
 * Pulls the token out of an `Authorization: Bearer <token>` header value per
 * RFC 6750 (the auth scheme name is case-insensitive; the token isn't).
 * Returns `undefined` for anything that isn't a well-formed bearer header -
 * callers treat that identically to "no header at all" (tolerate absence,
 * since most BiteJoy tools are public).
 */
export function extractBearerToken(headerValue: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(headerValue) ? headerValue[0] : headerValue;
  if (!raw) return undefined;

  const match = /^Bearer\s+(\S+)$/i.exec(raw.trim());
  return match?.[1];
}
