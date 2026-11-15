import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { I18nProvider } from './i18n'
import { MotionProvider, resolveEntrance } from './context/MotionContext'
import { house } from './utils/ease'
import { forgetScroll } from './utils/scrollMemory'

// Scroll restoration is owned here so the browser does not fight the
// per-route handling: a page reached by going back or forward opens where it
// was left (useScrollMemory), every other page at its top.
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual'
}

// sessionStorage persists across reloads in the same tab. A hard load wants a
// fresh entrance from the top, so the record of scroll positions is dropped.
try {
  const nav = performance.getEntriesByType?.('navigation')?.[0] as PerformanceNavigationTiming | undefined
  if (nav?.type === 'reload' || nav?.type === 'navigate') forgetScroll()
} catch {
  // Navigation timing is not critical: fall through silently.
}

// The built page loads its stylesheet without holding the loader's first frame
// (vite.config.ts, loaderFirst), so nothing renders until that sheet has
// applied: the hero is never seen unstyled through the ks. windows. In dev, and
// once the sheet is in, there is nothing to wait for.
const stylesReady = (): Promise<void> => {
  const link = document.querySelector<HTMLLinkElement>('link[data-app-css]')
  if (!link || (link.rel === 'stylesheet' && link.sheet)) return Promise.resolve()
  return new Promise((resolve) => {
    const check = (): void => {
      if (link.rel === 'stylesheet' && link.sheet) resolve()
    }
    link.addEventListener('load', check)
    link.addEventListener('error', () => resolve())
    new MutationObserver(check).observe(link, { attributes: true, attributeFilter: ['rel'] })
  })
}

const mount = (): void => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <I18nProvider>
          <MotionProvider>
            <App />
          </MotionProvider>
        </I18nProvider>
      </BrowserRouter>
    </StrictMode>,
  )

  // After React has painted at least once (double rAF): let the live paint show
  // through the windows, then start the explosion once the hold has passed.
  // `performance.now()` counts from the start of the navigation.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      loaderEl?.classList.add('loader--mounted')
      afterFirstPaint(() => window.setTimeout(liftCurtain, Math.max(0, MIN_HOLD_MS - performance.now())))
    })
  })
}

// Loader controller. The ink loader in index.html paints at first byte; its
// ks. windows show a stand-in in the paint's colours, then (once React has painted) the live
// paint through it. It leaves by the ks. explosion: a short contraction, then
// an accelerating zoom through the cutout, after which the entrance gate
// resolves and the page's opening type rises.

const reduceMotion = (() => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
})()
// The hold on "ks.": the explosion starts once React has painted, and no
// sooner than this long after the navigation began, so the mark is always
// seen before it moves.
const MIN_HOLD_MS = 200
const MAX_WAIT_MS = 3000

// The scale origin sits mid-band in the s glyph's upper-bowl spine, the fill
// point nearest the screen centre with the mark optically centred on "ks".
// The blow-through ends fully transparent at any aspect ratio: the smallest
// clearing scale is about 35.6 (the bottom-left corner binds), and 45 leaves
// a margin of about 26 %.
const ORIGIN_X = 53.65
const ORIGIN_Y = 50
const ANTICIPATION_SCALE = 0.96
const ANTICIPATION_S = 0.18
const EXPLOSION_SCALE = 45
const EXPLOSION_S = 1.1
// The explosion accelerates as t^5: an ease with a decelerating tail would play
// that tail entirely off-screen. The ink clears the name's corner of the
// screen at about 92 % of it, which is when the page is handed over.
const HANDOFF_FRACTION = 0.92
const META_EXIT_S = 0.22
// The stand-in tint thins out while the cutout is still small.
const STANDIN_FADE_S = 0.5

// The lift waits this long, at most, for the hero's paint to draw its first
// frame: building the shader is the heaviest moment of the load on a phone,
// and it must not land inside the explosion.
const PAINT_WAIT_MS = 500

const loaderEl = document.getElementById('loader')
let lifted = false

/** Runs `then` once the hero's paint has drawn a frame, has given way to its stand-in, or is not on this page. */
const afterFirstPaint = (then: () => void): void => {
  const canvas = document.querySelector<HTMLCanvasElement>('canvas[data-canvas="fluid-waves"]')
  if (!canvas) {
    then()
    return
  }
  const since = performance.now()
  const poll = (): void => {
    if (canvas.dataset.painted || !canvas.isConnected || performance.now() - since >= PAINT_WAIT_MS) then()
    else requestAnimationFrame(poll)
  }
  poll()
}

// The scroll lock in index.css keys off this attribute, and so does
// useScrollLockDuringEntrance; both writers converge on 'done'.
document.body.dataset.loaderState = 'loading'

const finishLoader = (): void => {
  loaderEl?.remove()
  document.documentElement.removeAttribute('data-loading')
  document.body.dataset.loaderState = 'done'
  resolveEntrance()
}

const liftCurtain = (): void => {
  if (lifted) return
  lifted = true
  if (!loaderEl) {
    // No loader element: still release the scroll lock and resolve the gate.
    document.documentElement.removeAttribute('data-loading')
    document.body.dataset.loaderState = 'done'
    resolveEntrance()
    return
  }
  if (reduceMotion) {
    // No explosion: the whole loader fades (CSS opacity), then goes.
    loaderEl.classList.add('loader--exit')
    window.setTimeout(finishLoader, 200)
    return
  }
  const ksEl = loaderEl.querySelector<SVGGElement>('.loader-ks')
  const standinEl = loaderEl.querySelector<HTMLElement>('.loader-standin')
  const metaBl = loaderEl.querySelector<HTMLElement>('.loader-meta--bl')
  const metaBr = loaderEl.querySelector<HTMLElement>('.loader-meta--br')
  if (!ksEl) {
    finishLoader()
    return
  }

  const standinFrom = standinEl ? Number.parseFloat(getComputedStyle(standinEl).opacity) || 0 : 0
  if (standinEl) standinEl.style.transition = 'none'

  const liftedAt = performance.now()
  let handedOver = false
  const frame = (now: number): void => {
    const elapsed = (now - liftedAt) / 1000
    const burst = Math.min(1, Math.max(0, (elapsed - ANTICIPATION_S) / EXPLOSION_S))
    const scale =
      elapsed < ANTICIPATION_S
        ? 1 + (ANTICIPATION_SCALE - 1) * house(elapsed / ANTICIPATION_S)
        : ANTICIPATION_SCALE + (EXPLOSION_SCALE - ANTICIPATION_SCALE) * burst ** 5
    ksEl.setAttribute(
      'transform',
      `translate(${ORIGIN_X} ${ORIGIN_Y}) scale(${scale}) translate(${-ORIGIN_X} ${-ORIGIN_Y})`,
    )

    // Second layer: the corner labels drift outward and down as they fade,
    // accelerating out as the explosion launches.
    const exit = Math.min(1, Math.max(0, (elapsed - ANTICIPATION_S) / META_EXIT_S)) ** 3
    if (metaBl) {
      metaBl.style.transform = `translate(${-12 * exit}px, ${12 * exit}px)`
      metaBl.style.opacity = String(1 - exit)
    }
    if (metaBr) {
      metaBr.style.transform = `translate(${12 * exit}px, ${12 * exit}px)`
      metaBr.style.opacity = String(1 - exit)
    }
    if (standinEl) {
      // Thinning from the first frame of the lift, done at the same moment of the explosion as ever.
      const fade = Math.min(1, Math.max(0, elapsed / (ANTICIPATION_S + STANDIN_FADE_S)))
      standinEl.style.opacity = String(standinFrom * (1 - fade))
    }

    // The opening type starts to rise while the explosion blows through, so
    // there is no dead gap between the ink clearing and the text moving.
    if (!handedOver && burst >= HANDOFF_FRACTION) {
      handedOver = true
      resolveEntrance()
    }
    if (burst >= 1) {
      finishLoader()
      return
    }
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  // Frames stop in a hidden tab; the page must not stay locked behind the ink.
  window.setTimeout(() => {
    if (document.body.dataset.loaderState !== 'done') finishLoader()
  }, (ANTICIPATION_S + EXPLOSION_S) * 1000 + 1500)
}

// Hard fallback: the lift always starts within MAX_WAIT.
window.setTimeout(liftCurtain, MAX_WAIT_MS)

void stylesReady().then(mount)
