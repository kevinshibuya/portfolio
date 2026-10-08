import { defineConfig, devices, type Project } from '@playwright/test'

// Suites and mobile scope, ADR 0013. `E2E_SUITE=quick` is the PR fix loop:
// desktop only, QUICK_SPECS only. Unset (or `full`) runs everything, so a bare
// `npx playwright test` stays the safe default. Mobile runs only the specs whose
// behaviour changes with the viewport; a new viewport-dependent surface joins
// MOBILE_SPECS in the PR that adds it.
const QUICK_SPECS = ['scene-scrub', 'stream', 'scene-no-webgl', 'frieze-surface', 'pixel-gate', 'scene-reduced-motion', 'smoke']
const MOBILE_SPECS = ['scene-scrub', 'stream', 'scene-no-webgl', 'frieze-surface', 'frieze-click', 'light-chapter', 'nav-on-light', 'hero-dissolve', 'pixel-gate', 'smoke']
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
    // The act-two wall sizes its coverage masks from the canvas box times the
    // renderer DPR, and the two projects above leave a whole sizing regime with
    // no rendered coverage: Desktop Chrome is deviceScaleFactor 1, and Pixel 5
    // is capped to 1.5 but only 727 px tall. So on desktop CI has never rendered
    // at DPR 1.5, the 612.8 texels/world density ceiling (which needs >=1080 CSS
    // px of canvas height) has never rendered at all, and the 2024 block's panel
    // split renders only on the phone. That regime also carries the largest mask
    // allocation, 27.16 MiB steady and 71.40 MiB peak against an 86.45 MiB
    // budget, so an allocation or sampling failure there would first appear on a
    // reader's tall screen after merge.
    //
    // 1280 wide, not 1920: the mask set is byte-identical at every 1080-tall
    // canvas — 27.16 MiB across the same five panels, 2024 split included —
    // because the density is height-driven once the height term binds. Width
    // therefore buys no extra coverage, only backing store, and a software
    // rasteriser pays for every pixel of it: 1920x1080 at DPR 1.5 is a 2864x1620
    // buffer that could not finish the scene warm-up inside openScene's 30 s cap
    // here, while 1280 is 1904x1620, a third less work, for the same regime.
    //
    // Scoped with testMatch to the wall's own rendered-surface spec: this exists
    // to render the ceiling regime once, not to run the suite a third time. That
    // spec is the one that would actually catch a failure unique to this regime —
    // it sweeps act two, reads real glyph and cream pixels, hovers, and switches
    // language, all against masks built at the ceiling. The hit geometry the
    // click specs assert is DPR-independent and already covered twice over. No golden is
    // added — the pixel gate stays hero-only by decision (ADR 0007), and these
    // specs assert behaviour (frame-loop errors, hover brackets, console) rather
    // than comparing pixels across machines.
    {
      name: 'desktop-hidpi',
      testMatch: /frieze-surface\.spec\.ts$/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1080 },
        deviceScaleFactor: 1.5,
      },
    },
  ],
})
