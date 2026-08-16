import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // workers:1 — DO NOT raise this. Two independent reasons, both load-bearing:
  //
  // 1. The pixel gate (tests/e2e/pixel-gate.spec.ts) is calibrated at exactly
  //    one worker and ASSERTS it in a beforeAll. Concurrent WebGL pages add GPU
  //    contention its tolerance was never characterised under, and a
  //    contention-induced red would get an innocent optimization batch
  //    reverted — the gate is the campaign's sole visual judge, with no human
  //    eyeball in the loop. A bare `npx playwright test` is what the QA gate,
  //    future tasks and handoff docs actually run, so the DEFAULT has to be
  //    correct; fixing it in one npm script would not cover them.
  // 2. The loader → hero handoff tests must observe in-flight state of a 700ms
  //    animation. Under parallel pressure the shared preview server delays page
  //    loads enough that the loader can complete before tests sample it. This
  //    was already walked 4 → 2 for that reason; 1 is strictly better for them,
  //    not a compromise.
  //
  // The suite has been de facto serial all along (green at --workers=1); this
  // makes the config say what the suite already required.
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 5'] } },
  ],
})
