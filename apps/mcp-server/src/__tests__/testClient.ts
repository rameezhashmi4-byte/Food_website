import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createBiteJoyServer } from "../server.js";

/**
 * Spins up a real BiteJoy MCP server and a real MCP client, wired together
 * over an in-memory transport - so tests exercise the actual protocol layer
 * (input/output schema validation, error shapes, resource reads) rather
 * than calling tool handlers as plain functions.
 */
export async function createConnectedTestClient() {
  const server = createBiteJoyServer();
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
