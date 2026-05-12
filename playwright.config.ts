import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for end-to-end smoke tests against the production build.
 *
 * `bun run build && bun run preview` produces a static dist at :4173.
 * Tests assume the preview server is running; configure `webServer` so
 * `bunx playwright test` launches it automatically.
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
    command: "bun run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
