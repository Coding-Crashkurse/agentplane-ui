import { defineConfig } from '@playwright/test';

/**
 * E2E suite (SPEC §9) — runs against the platform's docker compose stack,
 * tagged @e2e and NOT part of the default test run.
 */
export default defineConfig({
  testDir: './e2e',
  grep: /@e2e/,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:8080',
    trace: 'retain-on-failure',
  },
});
