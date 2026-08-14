import { defineConfig, devices } from "@playwright/test";

const isWindows = process.platform === "win32";
const includeFirefox =
  !isWindows || process.env.PLAYWRIGHT_FIREFOX_WINDOWS === "1";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  // Keep Windows local runs serial; browser startup is the slowest path here.
  workers: isWindows ? 1 : 2,
  use: {
    baseURL: "http://127.0.0.1:4321",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm serve:dist -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    ...(includeFirefox
      ? [{ name: "firefox", use: { ...devices["Desktop Firefox"] } }]
      : []),
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 7"] } },
  ],
});
