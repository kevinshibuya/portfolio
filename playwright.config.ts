import { defineConfig, devices, type Project } from '@playwright/test'

// Suites and mobile scope, ADR 0013. `E2E_SUITE=quick` is the PR fix loop:
// desktop only, QUICK_SPECS only. Unset (or `full`) runs everything, so a bare
// `npx playwright test` stays the safe default. Mobile runs only the specs whose
// behaviour changes with the viewport; a new viewport-dependent surface joins
// MOBILE_SPECS in the PR that adds it.
const QUICK_SPECS = ['smoke', 'project-page', 'no-webgl', 'reduced-motion', 'navigation']
// project-page sets its own viewport per test, so it stays desktop-only.
const MOBILE_SPECS = ['smoke', 'no-webgl', 'reduced-motion', 'navigation']
// perf-budget's DPR test only exercises the 1.5 cap on Pixel 5's capped path,
// so the harness adds it to mobile; the default suite checks the rule at DPR 1.
const mobileSpecs = process.env.PERF_HARNESS === '1' ? [...MOBILE_SPECS, 'perf-budget'] : MOBILE_SPECS

const specs = (names: string[]): RegExp => new RegExp(`/(${names.join('|')})\\.spec\\.ts$`)

const suite = process.env.E2E_SUITE ?? 'full'
if (suite !== 'quick' && suite !== 'full') {
  throw new Error(`E2E_SUITE must be 'quick' or 'full' (or unset for full), got '${suite}'`)
}

const desktop: Project = { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'] } }

export default defineConfig({
  testDir: './tests/e2e',
  // workers:1. The perf specs (perf-budget, perf-hooks) count frames and GL
  // calls on the paint canvas and read wall-clock work; concurrent WebGL pages
  // on one software GPU add contention those counts were never characterised
  // under. The rest of the suite is fast enough serial, so the default stays 1.
  fullyParallel: true,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  webServer: {
    // `npm run preview` is itself `npm run build && wrangler dev` — a leading
    // `npm run build &&` here made every spawned e2e run build TWICE. Dropped;
    // this still builds exactly once before serving.
    command: 'npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
  },
  projects: suite === 'quick' ? [{ ...desktop, testMatch: specs(QUICK_SPECS) }] : [
    desktop,
    { name: 'mobile-chromium', testMatch: specs(mobileSpecs), use: { ...devices['Pixel 5'] } },
  ],
})
