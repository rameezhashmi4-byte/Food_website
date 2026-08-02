import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["packages/*/src/**/*.test.ts", "apps/mcp-server/src/**/*.test.ts"],
    environment: "node",
  },
});
