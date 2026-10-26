import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  outputDir: new URL("./test-results", import.meta.url).pathname,
  timeout: 180000,
  workers: 1,
  use: {
    baseURL: process.env.CAMPUSCLAW_URL || "http://127.0.0.1:8080",
    viewport: { width: 1440, height: 1000 },
    headless: true,
    actionTimeout: 15000,
    navigationTimeout: 15000,
    screenshot: "only-on-failure",
  },
  reporter: "list",
});
