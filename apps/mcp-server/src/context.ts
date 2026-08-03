import { FictionalRestaurantProvider, GooglePlacesProvider, type RestaurantProvider } from "@bitejoy/core";
import type { VerifiedAuth } from "./auth/index.js";
import { createUserRepositoryForToken } from "./repository/factory.js";
import type { UserRepository } from "./repository/types.js";

/**
 * Shared context every tool handler receives. `provider` is picked once at
 * startup (see @bitejoy/core/providers). `auth`/`repository` are Stage 3
 * additions and are per-request, not startup-fixed: the HTTP transport
 * verifies the caller's bearer token fresh on every request (there's no
 * persistent session in the stateless transport Stage 2 built - see
 * http.ts), so a new `AppContext` carrying that request's auth result is
 * built per-call rather than once at module load. Both are `undefined` for
 * an unauthenticated caller - which is the normal, expected case for every
 * public tool (search_restaurants and friends), not an error state.
 */
export interface AppContext {
  provider: RestaurantProvider;
  auth?: VerifiedAuth;
  repository?: UserRepository;
}

export interface CreateAppContextOptions {
  auth?: VerifiedAuth;
  /** Test-only escape hatch: inject a fake repository instead of building a real per-user Supabase client from `auth.accessToken`. */
  repository?: UserRepository;
}

export function createAppContext(options?: CreateAppContextOptions): AppContext {
  const provider = createRestaurantProvider();
  const auth = options?.auth;
  // Only ever build/attach a repository once we have verified auth - an
  // unauthenticated request gets `repository: undefined`, and every
  // authenticated tool's `requireAuthedContext` (lib/authGuard.ts) treats
  // "no repository" the same as "no auth" rather than assuming one implies
  // the other.
  const repository = auth ? (options?.repository ?? createUserRepositoryForToken(auth.accessToken)) : undefined;

  return { provider, auth, repository };
}

function createRestaurantProvider(): RestaurantProvider {
  const providerName = process.env.BITEJOY_PROVIDER ?? "fictional";

  if (providerName === "google_places") {
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error(
        "[bitejoy] BITEJOY_PROVIDER=google_places but GOOGLE_PLACES_API_KEY is not set - falling back to fictional demo data.",
      );
      return new FictionalRestaurantProvider();
    }
    return new GooglePlacesProvider({ apiKey });
  }

  return new FictionalRestaurantProvider();
}
