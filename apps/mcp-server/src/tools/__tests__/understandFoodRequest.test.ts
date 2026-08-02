import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";

describe("understand_food_request tool", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("returns structured criteria and is ready to search for a complete request", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "understand_food_request",
      arguments: {
        message:
          "Find somewhere fun near Croydon for four people tonight. Around £30 each, good burgers, drinks and somewhere with parking.",
      },
    });

    expect(result.isError).toBeFalsy();
    const structured = result.structuredContent as {
      readyToSearch: boolean;
      criteria: { locationLabel?: string; partySize?: number; cuisines?: string[] };
    };
    expect(structured.readyToSearch).toBe(true);
    expect(structured.criteria.locationLabel).toBe("Croydon");
    expect(structured.criteria.partySize).toBe(4);
    expect(structured.criteria.cuisines).toContain("burgers");
  });

  it("asks exactly one follow-up question when location is missing", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({
      name: "understand_food_request",
      arguments: { message: "Somewhere nice for dinner" },
    });

    const structured = result.structuredContent as { readyToSearch: boolean; missingEssential?: string };
    expect(structured.readyToSearch).toBe(false);
    expect(structured.missingEssential).toMatch(/whereabouts/i);
  });

  it("reports input that doesn't match the schema as a clean tool error", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.callTool({ name: "understand_food_request", arguments: { message: "" } });
    expect(result.isError).toBe(true);
  });
});
