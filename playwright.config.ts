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
});
