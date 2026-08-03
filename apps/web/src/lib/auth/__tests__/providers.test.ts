import { afterEach, describe, expect, it } from "vitest";
import { getOAuthProviderAvailability } from "../providers";

const ORIGINAL_GOOGLE = process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED;
const ORIGINAL_MICROSOFT = process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED;

afterEach(() => {
  process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED = ORIGINAL_GOOGLE;
  process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED = ORIGINAL_MICROSOFT;
});

describe("getOAuthProviderAvailability", () => {
  it("defaults to disabled when the env vars are unset", () => {
    delete process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED;
    delete process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED;

    expect(getOAuthProviderAvailability()).toEqual({ google: false, microsoft: false });
  });

  it("is disabled for any value other than the literal string 'true'", () => {
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED = "1";
    process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED = "yes";

    expect(getOAuthProviderAvailability()).toEqual({ google: false, microsoft: false });
  });

  it("enables a provider when its flag is exactly 'true'", () => {
    process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED = "true";
    process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED = "true";

    expect(getOAuthProviderAvailability()).toEqual({ google: true, microsoft: true });
  });
});
