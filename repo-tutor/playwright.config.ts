import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// Browser E2E against a production build (`npm run build` first, or use `npm run test:e2e`).
// External services are replaced by deterministic fakes (e2e/fake-services.ts); the real app code runs.
// Uses the machine's installed Google Chrome (no browser download).
const APP_PORT = 3200;
const FAKE_PORT = 4010;
// One fresh database per run. The env var carries the same path into the worker processes that re-load this file.
const dbFile = (process.env.RT_E2E_DB ??= path.join(os.tmpdir(), `repo-tutor-e2e-${Date.now()}.sqlite`));

export default defineConfig({
  testDir: "e2e",
  testMatch: /.*\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    channel: "chrome",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  outputDir: path.join(os.tmpdir(), "repo-tutor-e2e-artifacts"),
  webServer: [
    {
      command: "npx tsx e2e/fake-services.ts",
      url: `http://127.0.0.1:${FAKE_PORT}/health`,
      env: { FAKE_PORT: String(FAKE_PORT) },
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `npx next start -p ${APP_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_PATH: dbFile,
        GITHUB_API_URL: `http://127.0.0.1:${FAKE_PORT}`,
        GITHUB_RAW_URL: `http://127.0.0.1:${FAKE_PORT}/raw`,
        AI_BASE_URL: `http://127.0.0.1:${FAKE_PORT}`,
        AI_MODEL: "gemma3:1b",
        AI_TIMEOUT_MS: "20000",
        RATE_LIMIT_SCALE: "50", // the suite re-analyses fixtures many times from one IP
        NODE_ENV: "production",
      },
    },
  ],
});
