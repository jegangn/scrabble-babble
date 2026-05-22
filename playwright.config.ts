import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for end-to-end smoke tests against the production build.
 *
 * The `webServer` below builds + serves a static dist at :4173 so
 * `npx playwright test` launches it automatically. Uses npm (not bun) for
 * build/serve so it runs anywhere node/npm is on PATH.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    headless: true,
    // iPad-ish viewport so layouts match the target device.
    viewport: { width: 1180, height: 820 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run build && npm run preview -- --port 4173 --strictPort",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
