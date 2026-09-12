import { defineConfig, devices } from "@playwright/test";

const isWindows = process.platform === "win32";
const port = Number(process.env.PLAYWRIGHT_PORT || 4321);
if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  throw new Error("PLAYWRIGHT_PORT must be an unprivileged TCP port");
}
const serve = `pnpm serve:dist -- --host 127.0.0.1 --port ${port}`;
const includeFirefox =
  !isWindows || process.env.PLAYWRIGHT_FIREFOX_WINDOWS === "1";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: process.env.CI ? 2 : 0,
  // Keep Windows local runs serial; browser startup is the slowest path here.
  workers: isWindows ? 1 : 2,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      process.env.PLAYWRIGHT_SKIP_BUILD === "1"
        ? serve
        : `pnpm build && ${serve}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
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
