import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { gsap } from 'gsap'
import { CustomEase } from 'gsap/CustomEase'
import './i18n'
import './index.css'
import App from './App.tsx'
import { MotionProvider, resolveCurtain, resolveEntrance } from './context/MotionContext'

declare global {
  interface Window {
    // Deterministic verification hooks: let a Playwright sweep pause/seek the
    // loader exit (and cancel the wall-clock handoff timer) to screenshot
    // exact frames. Harmless in production.
    __loaderTl?: gsap.core.Timeline
    __loaderHandoffT?: number
  }
}

// Take ownership of scroll restoration so the browser doesn't fight our
// per-route handling: full reload starts at top + plays the hero entrance
// fresh; in-tab back-navigation runs our useLayoutEffect-driven restore
// in Home.tsx. Without this, the browser's default 'auto' restoration
// races against our restore and against ProjectDetail's scroll-to-top.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

// sessionStorage persists across reloads in the same tab. On a hard reload
// we want a fresh hero entrance from the top, so wipe the saved Home
// scroll-Y. Only the back-forward and SPA-internal navs should preserve it.
try {
  const nav = performance.getEntriesByType?.('navigation')?.[0] as
    | PerformanceNavigationTiming
    | undefined
  if (nav?.type === 'reload' || nav?.type === 'navigate') {
    sessionStorage.removeItem('portfolio:home:scrollY')
  }
} catch {
  // performance.getEntriesByType isn't critical — fall through silently.
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MotionProvider>
        <App />
      </MotionProvider>
    </BrowserRouter>
  </StrictMode>,
)

// Loader controller. The ink SVG loader in index.html paints at first byte;
// the ks. glyph windows show the stand-in gradient, then (post-mount) the live
// hero shader. We exit via the KS vignette explosion (anticipation, then an
// accelerating zoom-through of the mask cutout) once React has painted + a
// min dwell has elapsed, then resolve the curtain + entrance gates.
// Guarded so a GSAP init failure can never abort this module before the hard
// fallback below is armed — otherwise data-loading would leave the page
// scroll-locked on a blank screen forever.
try {
  gsap.registerPlugin(CustomEase)
  CustomEase.create('house', '0.22,1,0.36,1') // idempotent; Hero also registers it
} catch {
  // 'house' ease unavailable — the exit falls back to a default ease below.
}

const reduceMotion = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return false }
})()
// Savor beat: the live shader visibly drifts inside the ks. windows before
// the explosion (reduced motion keeps the old brief dwell).
const MIN_DWELL_MS = reduceMotion ? 200 : 1200
const MAX_WAIT_MS = 3000

const loaderEl = document.getElementById('loader')
const startedAt = performance.now()
let lifted = false

// Stamp the loader gate for the scroll-lock CSS + e2e specs (Task 1). The
// hook useScrollLockDuringEntrance also drives this attribute; both writers
// converge on 'done' once resolveEntrance() fires.
document.body.dataset.loaderState = 'loading'

const finishLoader = (): void => {
  // Drop the verification hooks with the loader — keeps the completed
  // timeline (and its detached-SVG closure) from being retained for the
  // page lifetime. No-op on paths that never set them (reduced motion).
  delete window.__loaderTl
  delete window.__loaderHandoffT
  loaderEl?.remove()
  document.documentElement.removeAttribute('data-loading')
  document.body.dataset.loaderState = 'done'
  resolveCurtain()
  resolveEntrance()
}

const liftCurtain = (): void => {
  if (lifted) return
  lifted = true
  if (!loaderEl) {
    // Defensive: no loader element (misconfigured deploy). Still release the
    // scroll lock so the page isn't frozen, and resolve both gates.
    document.documentElement.removeAttribute('data-loading')
    document.body.dataset.loaderState = 'done'
    resolveCurtain()
    resolveEntrance()
    return
  }
  if (reduceMotion) {
    // No explosion: fade the whole loader (CSS opacity 150ms), then remove.
    loaderEl.classList.add('loader--exit')
    window.setTimeout(finishLoader, 200)
    return
  }
  // Vignette explosion: the ks. cutout contracts slightly (anticipation),
  // then blows outward until the viewport sits entirely inside the k-stem
  // window — ink fully gone, hero revealed. Accelerating ease on the
  // explosion: an inOut's decel tail would play entirely off-screen.
  const ksEl = loaderEl.querySelector<SVGGElement>('.loader-ks')
  const metaBl = loaderEl.querySelector<HTMLElement>('.loader-meta--bl')
  const metaBr = loaderEl.querySelector<HTMLElement>('.loader-meta--br')
  // Scale origin = exact viewBox center (50, 50) so the expansion reads as
  // perfectly centered on screen. That point sits inside the s glyph's
  // upper-bowl stroke (verified via isPointInFill; band extents from the
  // origin: left 2.0 / right 1.75 / up 4.25 / down 3.2 viewBox units), so the
  // blow-through ends fully transparent at any aspect ratio (xMidYMid slice
  // crops what's visible, never the mask geometry). Min clearing scale ≈ 32
  // (bottom-left screen corner is binding); 45 gives ~40% margin.
  const ORIGIN_X = 50
  const ORIGIN_Y = 50
  const ANTICIPATION_SCALE = 0.96
  const ANTICIPATION_S = 0.18
  const EXPLOSION_SCALE = 45
  const EXPLOSION_S = 1.1
  // GSAP power4.in is quintic (t⁵). The ink clears the lower-left name region
  // (bottom-left name corner needs scale ≈ 25.5×) at ~89% of the explosion;
  // at the 50% wall-clock midpoint the cutout is still only ≈ 2.3×.
  const HANDOFF_FRACTION = 0.89
  if (!ksEl) {
    finishLoader()
    return
  }
  // Fire the hero rise while the explosion blows through — no dead gap
  // between "ink clearing" and "text starts". finishLoader still removes the
  // loader at 100%.
  const handoff = (): void => {
    resolveCurtain()
    resolveEntrance()
  }
  const proxy = { s: 1 }
  const applyScale = (): void => {
    ksEl.setAttribute(
      'transform',
      `translate(${ORIGIN_X} ${ORIGIN_Y}) scale(${proxy.s}) translate(${-ORIGIN_X} ${-ORIGIN_Y})`,
    )
  }
  // If GSAP ever throws building the exit, finish immediately rather than
  // stranding the loader (and the scroll lock) on screen.
  try {
    const tl = gsap.timeline({ onComplete: finishLoader })
    tl.to(proxy, { s: ANTICIPATION_SCALE, duration: ANTICIPATION_S, ease: 'house', onUpdate: applyScale }, 0)
    tl.to(proxy, { s: EXPLOSION_SCALE, duration: EXPLOSION_S, ease: 'power4.in', onUpdate: applyScale }, ANTICIPATION_S)
    // Secondary motion layer: corner labels drift outward+down while fading
    // as the explosion launches (accelerate — they exit). Not opacity-only.
    if (metaBl) tl.to(metaBl, { x: -12, y: 12, opacity: 0, duration: 0.22, ease: 'power2.in' }, ANTICIPATION_S)
    if (metaBr) tl.to(metaBr, { x: 12, y: 12, opacity: 0, duration: 0.22, ease: 'power2.in' }, ANTICIPATION_S)
    window.__loaderTl = tl
    // Wall-clock setTimeout rather than a GSAP position callback — GSAP's
    // scheduled callbacks proved unreliable here (see git history). The id is
    // exposed so the verification sweep can cancel it after pausing the tl.
    window.__loaderHandoffT = window.setTimeout(handoff, (ANTICIPATION_S + EXPLOSION_S * HANDOFF_FRACTION) * 1000)
  } catch {
    finishLoader()
  }
}

// Hard fallback — always start the lift within MAX_WAIT.
window.setTimeout(liftCurtain, MAX_WAIT_MS)

// After React has painted at least once (double rAF): reveal the live shader
// through the windows (fade the stand-in), then start the explosion after dwell.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    loaderEl?.classList.add('loader--mounted')
    const elapsed = performance.now() - startedAt
    window.setTimeout(liftCurtain, Math.max(0, MIN_DWELL_MS - elapsed))
  })
})
