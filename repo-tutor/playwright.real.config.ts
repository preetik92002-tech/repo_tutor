import { defineConfig } from "@playwright/test";
import os from "node:os";
import path from "node:path";

// OPTIONAL real-model smoke test. Not part of `npm test` / `playwright test`.
// Requires a running Ollama with the configured model pulled (default gemma3:1b) and `npm run build`.
// GitHub is still faked (deterministic repo); only the AI is real, so output is non-deterministic.
//   RT_REAL_AI=1 npx playwright test -c playwright.real.config.ts
const APP_PORT = 3201;
const FAKE_PORT = 4011;
const dbFile = (process.env.RT_E2E_DB ??= path.join(os.tmpdir(), `repo-tutor-real-${Date.now()}.sqlite`));

export default defineConfig({
  testDir: "e2e-real",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${APP_PORT}`, channel: "chrome", trace: "retain-on-failure" },
  outputDir: path.join(os.tmpdir(), "repo-tutor-real-artifacts"),
  webServer: [
    { command: "npx tsx e2e/fake-services.ts", url: `http://127.0.0.1:${FAKE_PORT}/health`, env: { FAKE_PORT: String(FAKE_PORT) }, reuseExistingServer: false, timeout: 30_000 },
    {
      command: `npx next start -p ${APP_PORT} -H 127.0.0.1`,
      url: `http://127.0.0.1:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        DATABASE_PATH: dbFile,
        GITHUB_API_URL: `http://127.0.0.1:${FAKE_PORT}`,
        GITHUB_RAW_URL: `http://127.0.0.1:${FAKE_PORT}/raw`,
        AI_BASE_URL: process.env.AI_BASE_URL ?? "http://127.0.0.1:11434",
        AI_MODEL: process.env.AI_MODEL ?? "gemma3:1b",
        AI_TIMEOUT_MS: "180000",
        NODE_ENV: "production",
      },
    },
  ],
});
