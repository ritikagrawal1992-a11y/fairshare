import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:4323",
    viewport: { width: 1440, height: 1000 },
    timezoneId: "Asia/Kolkata",
  },
  webServer: {
    command: "PORT=4323 DATABASE_PATH=:memory: npm start",
    url: "http://127.0.0.1:4323/api/health",
    reuseExistingServer: false,
  },
  reporter: "list",
});
