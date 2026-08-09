import { describe, expect, it, vi } from "vitest";
import { GooglePlacesProvider } from "../googlePlacesProvider.js";

function jsonResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    statusText: ok ? "OK" : "Internal Server Error",
    json: async () => body,
  } as Response;
}

describe("GooglePlacesProvider.resolveLocation", () => {
  it("resolves a worldwide location (Tokyo) with no country/region restriction on the request", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        results: [{ formatted_address: "Tokyo, Japan", geometry: { location: { lat: 35.6762, lng: 139.6503 } } }],
      }),
    );
    const provider = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });

    const resolved = await provider.resolveLocation("Tokyo, Japan");

    expect(resolved).toEqual({ label: "Tokyo, Japan", coordinates: { lat: 35.6762, lng: 139.6503 } });

    const requestedUrl = new URL(fetchImpl.mock.calls[0][0] as string);
    expect(requestedUrl.origin + requestedUrl.pathname).toBe("https://maps.googleapis.com/maps/api/geocode/json");
    expect(requestedUrl.searchParams.get("address")).toBe("Tokyo, Japan");
    // No country/region bias of any kind - this is what makes it genuinely worldwide.
    expect(requestedUrl.searchParams.has("region")).toBe(false);
    expect(requestedUrl.searchParams.has("components")).toBe(false);
  });

  it("resolves a second, unrelated worldwide location (Sao Paulo) just as well", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        status: "OK",
        results: [{ formatted_address: "Sao Paulo, State of Sao Paulo, Brazil", geometry: { location: { lat: -23.5505, lng: -46.6333 } } }],
      }),
    );
    const provider = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });

    const resolved = await provider.resolveLocation("Sao Paulo");

    expect(resolved?.coordinates).toEqual({ lat: -23.5505, lng: -46.6333 });
  });

  it("returns undefined (not a throw) when Google has zero results", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ status: "ZERO_RESULTS" }));
    const provider = new GooglePlacesProvider({ apiKey: "test-key", fetchImpl });

    expect(await provider.resolveLocation("Nowhereville")).toBeUndefined();
  });

  it("throws when no API key is configured", async () => {
    const provider = new GooglePlacesProvider({ apiKey: "" });
    await expect(provider.resolveLocation("Tokyo")).rejects.toThrow(/API key/);
  });
});
