import { describe, expect, it } from "vitest";
import { isOfferActive, type Offer } from "../restaurant.js";

function makeOffer(validFrom: string, validUntil: string): Offer {
  return {
    id: "offer_1",
    restaurantId: "r_1",
    type: "happy_hour",
    title: "Test offer",
    validFrom,
    validUntil,
    meta: { source: "fictional_demo", lastCheckedAt: new Date().toISOString(), isVerified: true },
  };
}

describe("isOfferActive", () => {
  it("is active strictly within its validity window", () => {
    const offer = makeOffer(new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() + 60_000).toISOString());
    expect(isOfferActive(offer)).toBe(true);
  });

  it("is not active once expired", () => {
    const offer = makeOffer(new Date(Date.now() - 120_000).toISOString(), new Date(Date.now() - 60_000).toISOString());
    expect(isOfferActive(offer)).toBe(false);
  });

  it("is not active before it starts", () => {
    const offer = makeOffer(new Date(Date.now() + 60_000).toISOString(), new Date(Date.now() + 120_000).toISOString());
    expect(isOfferActive(offer)).toBe(false);
  });
});
