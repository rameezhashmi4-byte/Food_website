import { describe, expect, it, afterEach } from "vitest";
import { createConnectedTestClient } from "../../__tests__/testClient.js";
import { COMPARISON_WIDGET_URI, RESULTS_WIDGET_URI } from "../constants.js";

describe("widget resources", () => {
  let harness: Awaited<ReturnType<typeof createConnectedTestClient>>;

  afterEach(async () => {
    await harness?.close();
  });

  it("lists both widget resources", async () => {
    harness = await createConnectedTestClient();
    const { resources } = await harness.client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain(RESULTS_WIDGET_URI);
    expect(uris).toContain(COMPARISON_WIDGET_URI);
  });

  it("reads non-empty HTML content for the results widget", async () => {
    harness = await createConnectedTestClient();
    const result = await harness.client.readResource({ uri: RESULTS_WIDGET_URI });
    expect(result.contents.length).toBeGreaterThan(0);
    const content = result.contents[0];
    expect(content?.mimeType).toBe("text/html+skybridge");
    expect(typeof (content as { text?: string }).text).toBe("string");
    expect(((content as { text?: string }).text ?? "").length).toBeGreaterThan(0);
  });
});
