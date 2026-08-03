import { defineConfig } from "vitest/config";

// Self-contained (not wired into the root vitest.config.ts, which only
// covers packages/* and apps/mcp-server today) - `npm run test -w
// @bitejoy/web` runs this directly, matching how `@bitejoy/chatgpt-app`
// manages its own tests independently too.
export default defineConfig({
  test: {
    include: ["src/**/__tests__/**/*.test.ts"],
    environment: "node",
  },
});
