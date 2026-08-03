/**
 * Whether the Google / Microsoft login buttons should be enabled, per this
 * deploy's env vars - see the long comment in `.env.example` for why this
 * is an explicit flag rather than something inferred at runtime. Read on
 * both the server (to reject a submit even if the button were somehow
 * enabled) and passed down to render the button's disabled state.
 */
export interface OAuthProviderAvailability {
  google: boolean;
  microsoft: boolean;
}

export function getOAuthProviderAvailability(): OAuthProviderAvailability {
  return {
    google: process.env.NEXT_PUBLIC_GOOGLE_LOGIN_ENABLED === "true",
    microsoft: process.env.NEXT_PUBLIC_MICROSOFT_LOGIN_ENABLED === "true",
  };
}
