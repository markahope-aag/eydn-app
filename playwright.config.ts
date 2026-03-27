import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./__tests__/visual",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:3000",
    screenshot: "on",
    trace: "off",
  },
  outputDir: "__tests__/visual/screenshots",
  projects: [
    // Auth setup — runs first, saves session for dashboard tests
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // Public pages — no auth needed
    {
      name: "public",
      testMatch: /responsive\.spec\.ts/,
    },
    // Dashboard pages — requires auth
    {
      name: "dashboard",
      testMatch: /dashboard\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        storageState: "playwright/.auth/user.json",
      },
    },
  ],
});
