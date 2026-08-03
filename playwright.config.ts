import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end coverage for `apps/web` (BiteJoy's Stage 3 website: auth +
 * saved-user state).
 *
 *  - Tests target ROUTE PATHS and semantic ARIA ROLES (`getByRole(...)`),
 *    not assumed CSS classes or markup, so they're robust to markup changes.
 *  - `webServer` below only starts a dev server if `apps/web/package.json`
 *    actually exists at config-load time, so this config fails fast with a
 *    clear connection error instead of hanging if the app is ever removed.
 *  - Override `E2E_BASE_URL` / `E2E_PORT` / `E2E_WEB_DEV_COMMAND` if the
 *    real app's dev script/port ends up different from the guesses below
 *    (`npm run dev -w @bitejoy/web` on port 3000).
 */

const here = path.dirname(fileURLToPath(import.meta.url));
const webAppPackageJson = path.join(here, "apps", "web", "package.json");
const webAppExists = existsSync(webAppPackageJson);

const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 3000;
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: webAppExists
    ? {
        command: process.env.E2E_WEB_DEV_COMMAND ?? "npm run dev -w @bitejoy/web",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          // Best-effort signal to the app that it's under E2E, in case it
          // wants to relax anything (e.g. accept the fixture's fake
          // Supabase session more readily). Harmless no-op otherwise.
          E2E_TEST_MODE: "1",
        },
      }
    : undefined,
});
