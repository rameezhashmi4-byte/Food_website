import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createBiteJoyServer } from "../server.js";
import type { CreateAppContextOptions } from "../context.js";

/**
 * Spins up a real BiteJoy MCP server and a real MCP client, wired together
 * over an in-memory transport - so tests exercise the actual protocol layer
 * (input/output schema validation, error shapes, resource reads) rather
 * than calling tool handlers as plain functions.
 *
 * `options` is Stage 3's addition: pass `{ auth, repository }` to stand up
 * a server as if a given user's bearer token had already been verified on
 * this request (see context.ts) - omit it entirely (the default) to get
 * the same anonymous, public-tools-only server Stage 2's tests already
 * rely on.
 */
export async function createConnectedTestClient(options?: CreateAppContextOptions) {
  const server = createBiteJoyServer(options);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "bitejoy-test-client", version: "0.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    },
  };
}
