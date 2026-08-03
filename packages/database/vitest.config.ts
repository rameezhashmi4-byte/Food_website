import { defineConfig } from "vitest/config";

// `npm run test -w @bitejoy/database` runs `vitest run` with this package's
// directory as cwd. The root `vitest.config.ts`'s `include` glob
// (`packages/*/src/**/*.test.ts`) is written relative to the repo root, so
// without a local config, Vitest (which uses the nearest config file found
// walking up from cwd) resolves that glob against `packages/database/` and
// finds nothing - this reproduces identically for every other package in
// the monorepo run the same way (e.g. `npm run test -w @bitejoy/core`), so
// it's a pre-existing quirk of running vitest scoped to one workspace, not
// specific to this package. This file makes `-w @bitejoy/database` work
// standalone without touching the shared root config.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
