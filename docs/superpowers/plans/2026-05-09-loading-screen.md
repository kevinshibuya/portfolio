# Loading Screen + Curtain Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tick each `- [ ]` to `- [x]` immediately after the step's action lands successfully — before moving to the next step.

**Goal:** Replace the current static-h1 LCP-prepaint hack with a deliberate dark-screen loader containing a large "ks" monogram, two-panel split curtain transition, and a `curtainGone` handshake so the SVG ink-draw hero entrance plays cleanly on the cream background.

**Architecture:** Loader markup lives in `index.html` so it paints at first frame (LCP candidate). `MotionContext` exposes a module-scope `curtainGone` promise mirroring the existing `entranceDone` pattern. `main.tsx` orchestrates: min-dwell + React-mounted + max-wait fallback → triggers the curtain-exit transition → removes the loader → calls `resolveCurtain()`. `HeroNameDrawing` awaits `curtainGone` before kicking off its trace animation. Reduced motion shortens dwell + replaces the slide with an opacity fade.

**Tech Stack:** React 19 + TypeScript + Vite 6 + TailwindCSS v4 (CSS via `src/index.css`). No new dependencies. CSS transitions only (no Framer Motion needed for the curtain). Lighthouse 12.8.2.

**Spec:** `docs/superpowers/specs/2026-05-09-loading-screen-design.md`. Continues on `feat/lighthouse-95`.

---

## File Structure

| File | Change |
|---|---|
| `src/context/MotionContext.tsx` | Add module-scope `_curtainGone` promise + `resolveCurtain()` function. Pre-resolve when `_entranceBypassed === true`. Export `curtainGone` and `resolveCurtain`. |
| `index.html` | Replace existing `#lcp-prepaint` h1 with `<div id="loader">` containing two `.loader-half` panels each holding a clipped `.loader-mark`. Add inline `<head>` script that toggles `body.is-loading` before parse. |
| `src/index.css` | Add loader rules: `.loader`, `.loader-half`, `.loader-mark`, `body.is-loading { overflow: hidden }`, `loader--exit` transition states, `@media (prefers-reduced-motion: reduce)` overrides. Remove the old `#lcp-prepaint` rules (which lived inline in index.html — none in css today). |
| `src/main.tsx` | Replace existing rAF h1-removal block with curtain controller: min-dwell + React-mount gate + max-wait fallback. Import `resolveCurtain` from MotionContext. |
| `src/components/ui/HeroNameDrawing.tsx` | Wrap the trace-animation kickoff in `curtainGone.then(...)`. Existing `entranceBypassed` and `prefersReducedMotion` fast-paths run BEFORE the await. |

**Files NOT modified:** `Hero.tsx`, `Header.tsx`, all section components, `Projects.tsx`, no other source files.

---

## Task 1: MotionContext — `curtainGone` promise + `resolveCurtain`

**Files:**
- Modify: `src/context/MotionContext.tsx`

This task is purely additive — no existing behavior changes. After this task, `curtainGone` is exported and can be awaited, but nothing calls `resolveCurtain()` yet. (That comes in Task 3.) Pre-resolution for the bypass case happens at module init since `_entranceBypassed` is false until `bypassEntrance()` is invoked, but we ALSO add a check in `bypassEntrance()` itself so the promise resolves the moment a back-nav from project detail happens.

- [x] **Step 1.1: Add module-scope curtain promise + resolver after `resolveEntrance` declaration**

In `src/context/MotionContext.tsx`, after line 35 (the `resolveEntrance` arrow function), add:

```ts
// Module-scoped curtain handshake. The static loader in index.html paints
// at first frame (LCP target). main.tsx calls resolveCurtain() after the
// curtain transition finishes lifting; HeroNameDrawing awaits curtainGone
// before kicking off the SVG trace animation, so the ink-draw plays on a
// clean cream stage rather than under the curtain.
let _resolveCurtain: Resolver | null = null
const _curtainGone: Promise<void> = new Promise<void>((res) => {
  _resolveCurtain = res
})
const resolveCurtain: Resolver = () => _resolveCurtain?.()
```

Use the Edit tool with old_string ending at `const resolveEntrance: Resolver = () => _resolveEntrance?.()` and new_string adding the block above immediately after it (preserve the blank line between blocks).

- [x] **Step 1.2: Pre-resolve `_curtainGone` when `bypassEntrance()` is called**

In the existing `bypassEntrance` function (around line 62-66), add a `resolveCurtain()` call alongside the existing `resolveEntrance()`:

Find:
```ts
  const bypassEntrance: Resolver = () => {
    _entranceBypassed = true
    setBypassed(true)
    resolveEntrance()
  }
```

Replace with:
```ts
  const bypassEntrance: Resolver = () => {
    _entranceBypassed = true
    setBypassed(true)
    resolveEntrance()
    // Back-nav from project detail: there's no full reload, so the loader
    // never rendered. Pre-resolve the curtain so HeroNameDrawing's await
    // in this scenario doesn't stall.
    resolveCurtain()
  }
```

- [x] **Step 1.3: Export `curtainGone` and `resolveCurtain` from the module**

At the bottom of `src/context/MotionContext.tsx`, after the existing `useMotion` function declaration, add:

```ts

// Module-level exports for non-React consumers (main.tsx) and for components
// that need to await curtain handoff (HeroNameDrawing) without going through
// the React context. Mirrors the `_entranceDone` accessor pattern.
export const curtainGone = _curtainGone
export { resolveCurtain }
```

- [x] **Step 1.4: Build to confirm types and exports compile**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
npm run build 2>&1 | tail -10
```

Expected: `✓ built in N.NNs`, no errors. The chunk-size warning is informational.

- [x] **Step 1.5: Commit**

Tick `- [ ]` → `- [x]` for steps 1.1–1.5 in this plan file, then commit:

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
git add src/context/MotionContext.tsx docs/superpowers/plans/2026-05-09-loading-screen.md
git commit -m "$(cat <<'EOF'
feat(motion): add curtainGone promise + resolveCurtain to MotionContext

Mirrors the existing entranceDone pattern. curtainGone resolves either
when main.tsx finishes lifting the index.html loader curtain (Task 3),
or eagerly when bypassEntrance() runs (back-nav from project detail —
no full reload, no loader rendered, no curtain to lift).

Pure addition — nothing awaits curtainGone yet (HeroNameDrawing wires
it up in Task 4). No behavior change.
EOF
)"
```

---

## Task 2: Loader markup + CSS

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

After this task, the loader is visible at first paint but does not lift (no JS controller yet — comes in Task 3). The page will be "stuck" on the loader; that's expected. Verify visually that the loader renders correctly.

- [x] **Step 2.1: Replace `#lcp-prepaint` h1 in `index.html` with loader markup**

In `index.html`, find:

```html
    <!-- Static pre-paint LCP target. Renders at HTML-parse time (~TTFB+50ms)
         so Lighthouse's LCP observer fires immediately on slow-4G mobile,
         instead of waiting 4-5s for React to mount and the entrance gate to
         clear. Transparent + aria-hidden + pointer-events:none means it's
         invisible to users and screen readers; it only exists so Lighthouse
         has a large text element to measure. -->
    <h1
      id="lcp-prepaint"
      aria-hidden="true"
      style="position:fixed;top:0;left:0;width:100vw;padding:25vh 5vw 0;box-sizing:border-box;font-family:'Plus Jakarta Sans',system-ui,sans-serif;font-size:clamp(72px,22vw,192px);line-height:0.92;letter-spacing:-0.05em;font-weight:700;color:#111822;pointer-events:none;user-select:none;margin:0;text-transform:lowercase;z-index:0;transition:opacity 220ms ease-out;"
    >kevin shibuya.</h1>
```

Replace with:

```html
    <!-- LOADER + CURTAIN. The two .loader-half panels paint at first frame
         on hard navigation; the .loader-mark inside each is the LCP candidate
         (locked at first paint per W3C LCP spec, even after panels animate
         away). Both halves carry the SAME mark positioned at the viewport's
         vertical center; each panel's overflow:hidden clips its half so the
         mark looks continuous across the seam. When main.tsx adds .loader--exit,
         the panels translate apart and the mark "tears". -->
    <div id="loader" aria-hidden="true">
      <div class="loader-half loader-half--top">
        <span class="loader-mark">ks</span>
      </div>
      <div class="loader-half loader-half--bottom">
        <span class="loader-mark">ks</span>
      </div>
    </div>
```

- [x] **Step 2.2: Add `body.is-loading` toggle inline-script in `<head>`**

Find the `</head>` line in `index.html`. Insert this `<script>` block immediately before it (after the font-preload link):

```html
    <script>
      // Lock body scroll while the loader is up. Set BEFORE React parses so
      // the document's initial render is already scroll-locked — prevents
      // a one-frame flash of scrollable content underneath the curtain on
      // very slow networks. main.tsx removes this class when it removes
      // the loader element.
      document.documentElement.dataset.loading = 'true'
      document.body && (document.body.classList.add('is-loading'))
    </script>
```

NOTE: at HTML parse time, `document.body` may not exist yet. The `document.body && (...)` guard handles that. As a backup, the inline script also sets a `data-loading` attribute on `<html>` (which DOES exist) so CSS can apply the lock via either hook.

- [x] **Step 2.3: Add loader CSS rules to `src/index.css`**

Find the `.sr-only` rule block in `src/index.css` (currently around lines 273-281). Insert the following CSS block IMMEDIATELY AFTER `.sr-only`'s closing `}` (so the loader styles live near other "utility / overlay" rules):

```css

/* =========================================================================
   LOADER + CURTAIN — paints at first frame from index.html, lifts via
   main.tsx after React mounts + min-dwell. Two-panel split: top translates
   up, bottom translates down. The .loader-mark "ks" sits at viewport center;
   each panel clips its half via overflow:hidden so the mark appears to tear
   along the seam when the panels separate.
   ========================================================================= */
html[data-loading='true'],
body.is-loading {
  overflow: hidden;
}

#loader {
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  /* Below: each half handles its own background + mark clipping. */
}

.loader-half {
  position: fixed;
  left: 0;
  width: 100vw;
  height: 50vh;
  background: #111822; /* ink — fallback hex; --ink token is loaded inside :root which may not be parsed yet for the loader's first paint */
  overflow: hidden;
  display: flex;
  justify-content: center;
  /* transition target: transform. Default is identity (curtain in place). */
  transition: transform 600ms cubic-bezier(0.85, 0, 0.15, 1);
  will-change: transform;
}

.loader-half--top {
  top: 0;
  align-items: flex-end; /* mark grows from below — its bottom edge sits at the panel's bottom (the seam) */
}

.loader-half--bottom {
  bottom: 0;
  align-items: flex-start; /* mark grows from above — its top edge sits at the panel's top (the seam) */
}

.loader-mark {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: clamp(140px, 30vw, 320px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.05em;
  text-transform: lowercase;
  color: #F6F9FC; /* cream — fallback hex */
  /* Both halves render the SAME mark; the parent panel's overflow:hidden +
     align-items (flex-end vs flex-start) clips the appropriate half. The
     mark itself overflows its panel so the visual reads as one continuous
     "ks" straddling the horizontal seam. */
  transform: translateY(50%); /* shift the mark down by half its own height so the seam cuts through its vertical center */
}

.loader-half--bottom .loader-mark {
  transform: translateY(-50%); /* the bottom half clips the top of the mark; shift up so the visible portion is the bottom half of the glyph */
}

/* Curtain exit: triggered by main.tsx adding .loader--exit to #loader. */
#loader.loader--exit .loader-half--top { transform: translateY(-100%); }
#loader.loader--exit .loader-half--bottom { transform: translateY(100%); }

/* Reduced motion: skip the slide; fade the whole loader out instead. */
@media (prefers-reduced-motion: reduce) {
  .loader-half {
    transition: none;
  }
  #loader {
    transition: opacity 150ms ease-out;
  }
  #loader.loader--exit {
    opacity: 0;
  }
}
```

- [x] **Step 2.4: Build to confirm CSS parses cleanly**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
npm run build 2>&1 | tail -10
```

Expected: `✓ built in N.NNs`. The output bundle includes the new CSS rules.

- [x] **Step 2.5: Visual smoke test — loader renders correctly**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
pkill -f "vite preview" 2>/dev/null
npm run preview -- --port 4173 --host 127.0.0.1 > /tmp/preview.log 2>&1 &
for i in 1 2 3 4 5; do curl -sf http://127.0.0.1:4173/ > /dev/null && break; sleep 1; done

mkdir -p /tmp/loader-screens
node <<'EOF'
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'commit' })
  await page.waitForTimeout(800)
  await page.screenshot({ path: '/tmp/loader-screens/desktop-loader.png' })
  await ctx.close()
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page2 = await ctx2.newPage()
  await page2.goto('http://127.0.0.1:4173/', { waitUntil: 'commit' })
  await page2.waitForTimeout(800)
  await page2.screenshot({ path: '/tmp/loader-screens/mobile-loader.png' })
  await ctx2.close()
  await browser.close()
})()
EOF
ls /tmp/loader-screens/
pkill -f "vite preview" 2>/dev/null
```

Expected: two PNG screenshots written. Both should show a dark `#111822` full-screen background with a centered cream "ks" mark visible. The loader will NOT have lifted (no JS controller yet — Task 3) so the page sits on the curtain.

If you can view the screenshots, confirm:
- Dark ink background covers the full viewport (no cream visible)
- "ks" mark in cream color, centered horizontally
- Mark sized proportionally to the viewport (~30vw wide)
- Mark appears continuous across the horizontal seam (not visibly split or duplicated)

If something looks wrong (mark misaligned, wrong color, missing one half), inspect index.html and the CSS rules. Common issue: the mark's `translateY(50%)` and `translateY(-50%)` shifts are the trick that makes top/bottom halves appear continuous.

- [x] **Step 2.6: Commit**

Tick steps 2.1–2.6 in this plan, then:

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
git add index.html src/index.css docs/superpowers/plans/2026-05-09-loading-screen.md
git commit -m "$(cat <<'EOF'
feat(loader): static dark-curtain loader with two-panel split markup

Replace the inline transparent #lcp-prepaint h1 in index.html with
<div id="loader"> containing two .loader-half panels. Each panel
carries a copy of the "ks" mark positioned at viewport center; each
panel's overflow:hidden clips half the mark so visually the mark
appears continuous across the seam.

Adds loader CSS to src/index.css: panel positioning, mark typography
matching the design system, body.is-loading scroll lock,
loader--exit transition states (transform translateY ±100% over 600ms),
and prefers-reduced-motion overrides (instant 150ms opacity fade).

Inline <head> script sets html[data-loading=true] + body.is-loading
class before React parses, so the document loads with scroll already
locked.

NOTE: the loader does NOT lift yet — main.tsx still has the old rAF
h1-removal block from the prior LCP-prepaint approach. Task 3 wires
the curtain controller. Page will sit on the loader until then.
EOF
)"
```

---

## Task 3: main.tsx curtain controller

**Files:**
- Modify: `src/main.tsx`

After this task, the loader appears at first paint, then lifts after `min-dwell + React-mount` (capped at 3 s fallback). Hero plays UNDER the curtain because HeroNameDrawing isn't waiting for `curtainGone` yet (that's Task 4).

- [x] **Step 3.1: Replace the existing rAF h1-removal block with the curtain controller**

In `src/main.tsx`, find the existing block at lines 42-57:

```ts
// Remove the static pre-paint LCP <h1> once React has mounted. Lighthouse's
// LCP is locked at the first paint of that h1 (per W3C LCP spec, removing
// the LCP element from the DOM doesn't change the metric), so it's safe to
// take it out as soon as the real hero is in the tree. Double rAF + a tiny
// timeout ensures the browser had at least one paint with the prepaint
// element rendered, so the LCP candidate is reliably recorded. The CSS
// `transition: opacity 220ms` on #lcp-prepaint smooths the disappearance
// into the SVG ink-draw entrance that's beginning at the same moment.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const prepaint = document.getElementById('lcp-prepaint')
    if (!prepaint) return
    prepaint.style.opacity = '0'
    setTimeout(() => prepaint.remove(), 260)
  })
})
```

Replace with:

```ts
// Curtain controller. The loader in index.html paints at first frame
// (LCP candidate locked there). We lift the curtain when BOTH:
//   (a) React has mounted and committed at least one paint (double rAF), AND
//   (b) a minimum dwell has elapsed (so even instant React mounts on cached
//       reloads still show the loader long enough to be perceived).
// A 3 s hard fallback always lifts the curtain even if React stalls.
//
// After lifting:
//   1. .loader--exit class triggers the CSS transitions (panels slide apart
//      over 600 ms, or 150 ms opacity fade under prefers-reduced-motion).
//   2. setTimeout removes the loader element from the DOM.
//   3. resolveCurtain() flips the MotionContext signal that HeroNameDrawing
//      awaits before starting its trace animation.
const reduceMotion = (() => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches }
  catch { return false }
})()
const MIN_DWELL_MS = reduceMotion ? 200 : 600
const MAX_WAIT_MS = 3000
const TRANSITION_MS = reduceMotion ? 150 : 600

const loaderEl = document.getElementById('loader')
const startedAt = performance.now()
let lifted = false

const liftCurtain = (): void => {
  if (lifted) return
  lifted = true
  if (loaderEl) {
    loaderEl.classList.add('loader--exit')
    window.setTimeout(() => {
      loaderEl.remove()
      document.body.classList.remove('is-loading')
      delete document.documentElement.dataset.loading
      void import('./context/MotionContext').then((m) => m.resolveCurtain())
    }, TRANSITION_MS + 50)
  } else {
    // No loader element (defensive): still resolve the curtain so the hero
    // entrance doesn't stall in a misconfigured deploy.
    void import('./context/MotionContext').then((m) => m.resolveCurtain())
  }
}

// Hard fallback — always lift within MAX_WAIT, no matter what.
window.setTimeout(liftCurtain, MAX_WAIT_MS)

// Schedule the normal lift: after React has painted at least once
// (double rAF) AND min-dwell has elapsed.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const elapsed = performance.now() - startedAt
    const remaining = Math.max(0, MIN_DWELL_MS - elapsed)
    window.setTimeout(liftCurtain, remaining)
  })
})
```

The dynamic `import('./context/MotionContext')` keeps `resolveCurtain` from creating a cycle at module-load time and respects Vite's chunk graph (MotionContext is in the main entry chunk so the import resolves immediately at runtime — there's no extra network fetch).

Use the Edit tool with the exact old_string above and the new replacement.

- [x] **Step 3.2: Build to confirm types compile**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
npm run build 2>&1 | tail -10
```

Expected: `✓ built in N.NNs`, no errors.

- [x] **Step 3.3: Visual smoke — loader appears, lifts, hero plays under**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
pkill -f "vite preview" 2>/dev/null
npm run preview -- --port 4173 --host 127.0.0.1 > /tmp/preview.log 2>&1 &
for i in 1 2 3 4 5; do curl -sf http://127.0.0.1:4173/ > /dev/null && break; sleep 1; done

mkdir -p /tmp/curtain-lift-screens
node <<'EOF'
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'commit' })
  await page.screenshot({ path: '/tmp/curtain-lift-screens/01-instant.png' })
  await page.waitForTimeout(300)
  await page.screenshot({ path: '/tmp/curtain-lift-screens/02-300ms.png' })
  await page.waitForTimeout(400)
  await page.screenshot({ path: '/tmp/curtain-lift-screens/03-700ms-curtain-lifting.png' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/tmp/curtain-lift-screens/04-1200ms-after-curtain.png' })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: '/tmp/curtain-lift-screens/05-3200ms-final.png' })
  await ctx.close()
  await browser.close()
})()
EOF
ls /tmp/curtain-lift-screens/
pkill -f "vite preview" 2>/dev/null
```

Expected timeline (desktop):
- 01-instant.png: full dark loader visible, "ks" centered.
- 02-300ms.png: still loader (within min-dwell).
- 03-700ms-curtain-lifting.png: panels mid-split — top panel partway up, bottom panel partway down, "ks" tearing apart.
- 04-1200ms-after-curtain.png: cream background, hero entrance starting (or in progress) — but since HeroNameDrawing isn't waiting for `curtainGone` yet, the entrance may have ALREADY completed under the curtain. That's fine for this task; Task 4 fixes it.
- 05-3200ms-final.png: hero in its final state.

Confirm the curtain visibly slides apart (not snapping or fading). If the panels jump rather than transition smoothly, check that the CSS `transition: transform 600ms cubic-bezier(...)` on `.loader-half` is intact and that the transform values (`-100%` / `+100%`) are reaching the elements (inspect `getComputedStyle(...).transform` via DevTools if needed).

- [x] **Step 3.4: Commit**

Tick steps 3.1–3.4, then:

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
git add src/main.tsx docs/superpowers/plans/2026-05-09-loading-screen.md
git commit -m "$(cat <<'EOF'
feat(loader): main.tsx curtain controller with min-dwell + max-wait

Replace the prior rAF-based static-h1 hide block with a curtain
controller. Two gates close before the curtain lifts:
  1. React has mounted + painted (double requestAnimationFrame)
  2. Min dwell has elapsed (600 ms default, 200 ms under
     prefers-reduced-motion)
Hard fallback timer at 3 s always lifts the curtain regardless.

When triggered: adds .loader--exit class (CSS transitions handle the
slide-apart or fade), then after the transition removes the loader
element, removes body.is-loading, and calls resolveCurtain() to
notify HeroNameDrawing (which will await it in Task 4).

Hero ink-draw still plays under the curtain at this point — Task 4
wires the await so the entrance plays AFTER the curtain finishes.
EOF
)"
```

---

## Task 4: HeroNameDrawing — await `curtainGone` before trace

**Files:**
- Modify: `src/components/ui/HeroNameDrawing.tsx`

This is the final wiring step that makes the hero entrance play CLEANLY after the curtain instead of under it. The existing `entranceBypassed` and `prefersReducedMotion` fast-paths run BEFORE the await so those flows don't change behavior.

- [x] **Step 4.1: Import `curtainGone` at the top of `HeroNameDrawing.tsx`**

In `src/components/ui/HeroNameDrawing.tsx`, find the existing imports near the top:

```ts
import { useEffect, useRef, useState } from 'react'
import { useMotion } from '../../context/MotionContext'
import {
  NAME_KEVIN,
  NAME_SHIBUYA,
  NAME_ASCENT,
  NAME_DESCENT,
} from '../../data/glyphPaths'
```

Change the second import line to also bring in `curtainGone`:

```ts
import { useEffect, useRef, useState } from 'react'
import { useMotion } from '../../context/MotionContext'
import { curtainGone } from '../../context/MotionContext'
import {
  NAME_KEVIN,
  NAME_SHIBUYA,
  NAME_ASCENT,
  NAME_DESCENT,
} from '../../data/glyphPaths'
```

(Keeping `useMotion` and `curtainGone` on separate import lines keeps the diff small and grep-friendly. They both come from the same module, so a single combined import would also be valid if the codebase prefers that.)

- [x] **Step 4.2: Wrap the trace-animation kickoff in `curtainGone.then(...)`**

In the same file, find the existing `useEffect` block (currently lines 35-118). The relevant section is the post-fast-paths animation kickoff (after the `if (prefersReducedMotion) { ... return }` block).

Find:

```ts
    // Reset transitions before scheduling new ones.
    allPaths.forEach((p) => {
      p.style.transition = 'none'
    })
    void document.body.offsetHeight

    const totalTrace = (allPaths.length - 1) * STAGGER_MS + TRACE_DUR_MS

    const rafId = requestAnimationFrame(() => {
      allPaths.forEach((p, i) => {
        p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${i * STAGGER_MS}ms`
        p.style.strokeDashoffset = '0'
      })
    })

    // After the trace completes, replace the per-path inline transition
    // (currently scoped to stroke-dashoffset) with one that covers the
    // properties the ink-fill will animate, then flip React state to
    // apply the --ink / --ghost classes via JSX (so they survive any
    // future re-renders without being wiped by React reconciliation).
    const fillTimer = window.setTimeout(() => {
      const fillTransition = `fill ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), stroke ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), stroke-width ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      allPaths.forEach((p) => {
        p.style.transition = fillTransition
      })
      setInkFilled(true)
    }, totalTrace + 100)

    const completeTimer = window.setTimeout(() => {
      onComplete?.()
    }, totalTrace + 100 + INK_FILL_DUR_MS)

    return () => {
      cancelAnimationFrame(rafId)
      window.clearTimeout(fillTimer)
      window.clearTimeout(completeTimer)
    }
  }, [prefersReducedMotion, entranceBypassed, onComplete])
```

Replace with:

```ts
    // Reset transitions before scheduling new ones.
    allPaths.forEach((p) => {
      p.style.transition = 'none'
    })
    void document.body.offsetHeight

    const totalTrace = (allPaths.length - 1) * STAGGER_MS + TRACE_DUR_MS

    let cancelled = false
    let rafId = 0
    let fillTimer = 0
    let completeTimer = 0

    // Wait for the curtain in index.html to finish lifting before kicking
    // off the trace. On bypassEntrance() / first-load resolve from main.tsx,
    // the promise is already settled and this resolves on the next microtask.
    void curtainGone.then(() => {
      if (cancelled) return

      rafId = requestAnimationFrame(() => {
        allPaths.forEach((p, i) => {
          p.style.transition = `stroke-dashoffset ${TRACE_DUR_MS}ms cubic-bezier(0.65, 0, 0.35, 1) ${i * STAGGER_MS}ms`
          p.style.strokeDashoffset = '0'
        })
      })

      // After the trace completes, replace the per-path inline transition
      // (currently scoped to stroke-dashoffset) with one that covers the
      // properties the ink-fill will animate, then flip React state to
      // apply the --ink / --ghost classes via JSX (so they survive any
      // future re-renders without being wiped by React reconciliation).
      fillTimer = window.setTimeout(() => {
        const fillTransition = `fill ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), stroke ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1), stroke-width ${INK_FILL_DUR_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
        allPaths.forEach((p) => {
          p.style.transition = fillTransition
        })
        setInkFilled(true)
      }, totalTrace + 100)

      completeTimer = window.setTimeout(() => {
        onComplete?.()
      }, totalTrace + 100 + INK_FILL_DUR_MS)
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.clearTimeout(fillTimer)
      window.clearTimeout(completeTimer)
    }
  }, [prefersReducedMotion, entranceBypassed, onComplete])
```

Key change: the `requestAnimationFrame` and timer scheduling moved INSIDE `curtainGone.then(...)`. The cleanup return retains the same cancel logic but now also gates on the `cancelled` flag so a late curtain resolution doesn't kick off animations on an unmounted component.

- [x] **Step 4.3: Build to confirm types compile**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
npm run build 2>&1 | tail -10
```

Expected: `✓ built in N.NNs`, no TypeScript errors.

- [x] **Step 4.4: Visual smoke — full sequence loader → curtain lift → hero entrance**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
pkill -f "vite preview" 2>/dev/null
npm run preview -- --port 4173 --host 127.0.0.1 > /tmp/preview.log 2>&1 &
for i in 1 2 3 4 5; do curl -sf http://127.0.0.1:4173/ > /dev/null && break; sleep 1; done

mkdir -p /tmp/full-sequence-screens
node <<'EOF'
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'commit' })
  await page.screenshot({ path: '/tmp/full-sequence-screens/01-loader.png' })
  await page.waitForTimeout(700) // mid-curtain-lift
  await page.screenshot({ path: '/tmp/full-sequence-screens/02-curtain-lifting.png' })
  await page.waitForTimeout(300) // curtain just gone, ink-draw starting
  await page.screenshot({ path: '/tmp/full-sequence-screens/03-ink-draw-start.png' })
  await page.waitForTimeout(800) // mid ink-draw
  await page.screenshot({ path: '/tmp/full-sequence-screens/04-ink-draw-mid.png' })
  await page.waitForTimeout(1500) // hero settled
  await page.screenshot({ path: '/tmp/full-sequence-screens/05-hero-final.png' })
  await ctx.close()
  await browser.close()
})()
EOF
ls /tmp/full-sequence-screens/
pkill -f "vite preview" 2>/dev/null
```

Expected:
- 01-loader.png: full dark curtain with centered "ks"
- 02-curtain-lifting.png: panels mid-split, "ks" tearing apart
- 03-ink-draw-start.png: cream background visible, hero SVG paths just beginning to trace
- 04-ink-draw-mid.png: ink-draw mid-flight (strokes drawn, fill happening)
- 05-hero-final.png: hero at its final state with all supplementary content faded in

The KEY visual check vs the prior task: in 03/04, the ink-draw should be visibly playing on cream — not already completed when the curtain lifts. Compare to /tmp/curtain-lift-screens/04-1200ms-after-curtain.png from Task 3 (where the entrance had already completed under the curtain).

- [x] **Step 4.5: Commit**

Tick steps 4.1–4.5, then:

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
git add src/components/ui/HeroNameDrawing.tsx docs/superpowers/plans/2026-05-09-loading-screen.md
git commit -m "$(cat <<'EOF'
feat(hero): await curtainGone before kicking off ink-draw trace

HeroNameDrawing now awaits the curtainGone promise before scheduling
the trace + ink-fill animation. This ensures the ink-draw plays on a
clean cream background AFTER the curtain has finished lifting, rather
than under the curtain (where the user can't see the dramatic part
of the entrance).

Existing fast-paths (entranceBypassed + prefersReducedMotion) run
BEFORE the await — those flows skip the animation entirely and the
curtain wait isn't relevant. The bypass case also pre-resolves
curtainGone in MotionContext.bypassEntrance() so any consumer awaiting
it doesn't stall.
EOF
)"
```

---

## Task 5: Final verification + Lighthouse + spec ticks

**Files:**
- Modify: `docs/superpowers/specs/2026-05-09-loading-screen-design.md` (TODO checkboxes)

- [ ] **Step 5.1: Run full Lighthouse audit, mobile + desktop, all four categories**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
npm run build
pkill -f "vite preview" 2>/dev/null
npm run preview -- --port 4173 --host 127.0.0.1 > /tmp/preview.log 2>&1 &
for i in 1 2 3 4 5; do curl -sf http://127.0.0.1:4173/ > /dev/null && break; sleep 1; done

mkdir -p /tmp/lh-loader-final
npx lighthouse http://127.0.0.1:4173/ \
  --output=json --output=html --output-path=/tmp/lh-loader-final/mobile.report \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet 2>&1 | tail -3
npx lighthouse http://127.0.0.1:4173/ \
  --preset=desktop \
  --output=json --output=html --output-path=/tmp/lh-loader-final/desktop.report \
  --chrome-flags="--headless=new --no-sandbox" \
  --only-categories=performance,accessibility,best-practices,seo \
  --quiet 2>&1 | tail -3
pkill -f "vite preview" 2>/dev/null

ls /tmp/lh-loader-final/
node -e '
const fs = require("fs");
const dir = "/tmp/lh-loader-final";
const find = (which) => fs.readdirSync(dir).find(f => f.startsWith(which) && f.endsWith(".json"));
for (const which of ["mobile","desktop"]) {
  const f = find(which);
  if (!f) { console.log(`no ${which} json`); continue; }
  const r = JSON.parse(fs.readFileSync(`${dir}/${f}`, "utf8"));
  const c = r.categories;
  const m = r.audits;
  const lcpItems = m["largest-contentful-paint-element"]?.details?.items?.[0]?.items;
  const lcpSel = lcpItems?.find(i=>i.node)?.node?.selector || "?";
  console.log(`${which}: Perf ${Math.round(c.performance.score*100)} | A11y ${Math.round(c.accessibility.score*100)} | BP ${Math.round(c["best-practices"].score*100)} | SEO ${Math.round(c.seo.score*100)} | LCP ${m["largest-contentful-paint"].displayValue} | LCP-element: ${lcpSel}`);
}'
```

Expected: all four scores ≥ 95 on both viewports. LCP element should be inside `#loader` (e.g., `body > #loader > .loader-half--top > .loader-mark` or similar). Mobile LCP should be at or below the prior 2.2 s baseline (~likely ≤ 1 s since the loader is a much more obvious LCP candidate than the prior transparent h1).

If any score regressed below 95 vs the pre-loader state (Mobile 95 / 100 / 96 / 100, Desktop 100 / 96 / 96 / 100):
- Inspect the failing audit's `details.items` in the JSON
- Most likely regression vector: A11y (the loader's `.loader-mark` color contrast — cream `#F6F9FC` on ink `#111822` is ~14.6:1, well above AA, so this should pass; if Lighthouse flags it, double-check the actual computed colors in DevTools)
- If LCP element ISN'T inside `#loader`: the loader markup or CSS isn't painting at first frame. Check that the inline `<head>` script runs before any render-blocking resource and that the loader CSS rules don't have typos.

- [ ] **Step 5.2: Verify dev server still works**

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
pkill -f "vite" 2>/dev/null
sleep 1
npm run dev > /tmp/dev.log 2>&1 &
sleep 5
curl -sf http://127.0.0.1:5173/ > /dev/null && echo "dev OK" || echo "dev FAIL"
pkill -f "vite" 2>/dev/null
tail -10 /tmp/dev.log
```

Expected: `dev OK`. No console errors related to the loader.

- [ ] **Step 5.3: Verify reduced-motion behavior**

Run the audit with `prefers-reduced-motion: reduce` simulated:

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
pkill -f "vite preview" 2>/dev/null
npm run preview -- --port 4173 --host 127.0.0.1 > /tmp/preview.log 2>&1 &
for i in 1 2 3 4 5; do curl -sf http://127.0.0.1:4173/ > /dev/null && break; sleep 1; done

mkdir -p /tmp/loader-reduce-motion
node <<'EOF'
const { chromium } = require('playwright')
;(async () => {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  })
  const page = await ctx.newPage()
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'commit' })
  await page.screenshot({ path: '/tmp/loader-reduce-motion/01-instant.png' })
  await page.waitForTimeout(150) // mid-fade
  await page.screenshot({ path: '/tmp/loader-reduce-motion/02-150ms.png' })
  await page.waitForTimeout(300) // after fade
  await page.screenshot({ path: '/tmp/loader-reduce-motion/03-450ms.png' })
  await page.waitForTimeout(500)
  await page.screenshot({ path: '/tmp/loader-reduce-motion/04-final.png' })
  await ctx.close()
  await browser.close()
})()
EOF
ls /tmp/loader-reduce-motion/
pkill -f "vite preview" 2>/dev/null
```

Expected:
- 01-instant.png: full dark curtain (loader visible)
- 02-150ms.png: still dark or fading (within 200 ms min-dwell)
- 03-450ms.png: loader gone (fade completed; min-dwell elapsed ~250 ms ago)
- 04-final.png: hero in final state (no SVG entrance under reduced motion — paths render in their final filled state immediately)

The key check: the curtain should fade out via opacity rather than slide-apart. If the panels visibly slide, the `@media (prefers-reduced-motion: reduce)` block isn't taking effect — verify the CSS rules in `src/index.css`.

- [ ] **Step 5.4: Tick spec TODOs that are genuinely met**

Open `docs/superpowers/specs/2026-05-09-loading-screen-design.md` and tick the boxes whose acceptance criterion was verified by the audits and visual checks above. Specifically:

- `- [ ]` → `- [x]` for all checkboxes in the `## TODO` section that the verifications confirmed.
- Do NOT tick a box whose criterion didn't pass — fix the underlying issue and re-audit instead.

Verify with:

```bash
grep -nE '^\- \[[ x]\]' /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio/docs/superpowers/specs/2026-05-09-loading-screen-design.md
```

Look for any remaining `- [ ]` and only proceed if each is justified (or explain in your report).

- [ ] **Step 5.5: Final commit + retro snapshot**

Tick steps 5.1–5.5 in this plan, then:

```bash
cd /Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio
git add docs/superpowers/specs/2026-05-09-loading-screen-design.md docs/superpowers/plans/2026-05-09-loading-screen.md
git commit -m "$(cat <<'EOF'
docs(spec): tick loading-screen TODOs after final verification

Final Lighthouse measurements after the loader implementation:
  Mobile:  Perf <FILL> / A11y <FILL> / BP <FILL> / SEO <FILL>
  Desktop: Perf <FILL> / A11y <FILL> / BP <FILL> / SEO <FILL>

LCP element is now inside #loader (body > #loader ...). Hero ink-draw
plays cleanly on cream after the two-panel split curtain lifts.
prefers-reduced-motion users get a 150 ms opacity fade instead.

Replaces the static-h1 LCP-prepaint approach from the prior commits
on this branch (5eea097, 50785d6).
EOF
)"
git log --oneline main..HEAD | head -10
```

(Replace the `<FILL>` placeholders with the ACTUAL numbers from Step 5.1's output.)

- [ ] **Step 5.6: Hand off to user**

Report:
- Final score table (mobile + desktop, all four categories)
- Confirmation that the LCP element is inside `#loader`
- The five new commits (Tasks 1-5) on `feat/lighthouse-95`
- Note that the prior static-h1 commits (5eea097, 50785d6) are now superseded but not removed (they're part of the branch's history)
- Visual outcome: loader appears, curtain splits, hero plays cleanly

Ask: "Want me to merge `feat/lighthouse-95` into `main` now (mirror the prior session's flow), or hold while you eyeball it?"

---

## Plan self-review (run after writing the plan)

**Spec coverage check:**

| Spec section | Plan task |
|---|---|
| Visual structure (two-panel split, ks tears) | Task 2 step 2.1 (markup) + 2.3 (CSS) |
| Background ink, mark cream, mark size clamp | Task 2 step 2.3 |
| Two gates: React mounted + min-dwell | Task 3 step 3.1 |
| Hard fallback 3 s | Task 3 step 3.1 |
| Hero awaits curtain via `curtainGone` | Task 1 (promise) + Task 4 (await) |
| `bypassEntrance` pre-resolves curtain | Task 1 step 1.2 |
| Reduced motion: 150 ms fade + 200 ms dwell | Task 2 step 2.3 (CSS) + Task 3 step 3.1 (JS) |
| Cached / instant React mount | Task 3 step 3.1 (min-dwell guarantees visibility) |
| Network failure / React stalls | Task 3 step 3.1 (max-wait fallback) |
| Back-nav from `/projects/:slug` no loader | Inherent (loader only in index.html) + Task 1 step 1.2 (bypass pre-resolves) |
| Scroll lock during loader | Task 2 step 2.2 (inline script) + 2.3 (CSS) |
| z-index 9999 | Task 2 step 2.3 |
| File structure list | Plan's File Structure section |
| All ## TODO criteria | Task 5 |

No spec gaps.

**Placeholder scan:**
- Task 5 step 5.5 commit message has `<FILL>` placeholders for actual scores — these are intentional inline placeholders that the implementer fills with real measurements. Acceptable per the writing-plans skill since they're inside a quoted code block with explicit instruction "Replace the `<FILL>` placeholders with the ACTUAL numbers from Step 5.1's output."
- No other placeholders.

**Type / signature consistency:**
- `curtainGone` and `resolveCurtain` are defined in Task 1 with the EXACT names used in Tasks 3 (`m.resolveCurtain()`) and 4 (`curtainGone.then(...)`).
- CSS class names: `loader-half`, `loader-half--top`, `loader-half--bottom`, `loader-mark`, `loader--exit`, `is-loading` — all consistent across Task 2 (definitions) and Task 3 (className references).
- DOM IDs: `#loader` consistent across Task 2 markup and Task 3 `getElementById`.
- Constants: `MIN_DWELL_MS` (600/200), `MAX_WAIT_MS` (3000), `TRANSITION_MS` (600/150) — all consistent with the spec's stated values.

Plan is complete and consistent.
