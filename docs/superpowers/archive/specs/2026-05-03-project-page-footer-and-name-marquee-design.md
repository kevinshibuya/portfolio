# Project Page Closing + Footer Name Marquee — Design

**Date:** 2026-05-03
**Status:** Approved (pending user spec review)

## Summary

Two related changes to the page-end experience:

1. **Project Detail pages** get the existing `Contact` and `Footer` components appended below the project content, lazy-loaded in the same pattern `Home.tsx` uses.

2. **Footer-big** evolves from a static `<motion.div>` outline of "kevin shibuya" into an animated sequence: an ink-draw trace (two copies, sequential, drawn in cream-25% stroke from the start), then a direct handoff to an infinite leftward marquee of the same cream-outlined copies. No color cross-fade — the trace stroke and the resting marquee stroke are the same.

The trace mechanic mirrors `HeroNameDrawing` (per-glyph `pathLength=1` + `stroke-dashoffset 1→0`) so the page-close visually rhymes with the page-open. It diverges in three meaningful ways: single-line layout (kevin and shibuya in the same SVG), no ink-fill (the trace ends as a stroked outline forever), and a CSS-keyframes marquee handoff after the trace completes.

**Revised after visual verification (2026-05-03):** The original design called for a blue-400 trace that cross-faded to cream-25% before the marquee started. After seeing it on the page the cross-fade beat felt out of place against the dark footer section, so the trace was simplified to render in cream-25% from the start and skip the cross-fade phase entirely. The state machine collapses from four phases to three.

## Motivation

Project pages currently end at the live/source-code buttons — there is no closing CTA, no contact entry, no page-end punctuation. Users who finish reading a project case study have nowhere to go without scrolling back up.

The static footer-big "kevin shibuya" outline is one of the quieter elements on the dark closing section. Turning it into a slow, ambient marquee with a deliberate trace entrance gives the page a closing gesture that mirrors the hero's opening trace, without the noise of a fast or showy animation.

## Locked decisions (from brainstorm Q&A, revised after verification)

- **Trace stroke:** cream-25% (`rgba(246, 249, 252, 0.25)`) at stroke-width 6 from the start. No cross-fade beat. *(Originally specced as blue-400 → cream-25% cross-fade; revised after visual verification because the color shift felt out of place against the dark section.)*
- **Initial trace coverage:** always two copies, drawn sequentially (copy 1 fully, then copy 2). Marquee only starts after both copies have traced.
- **Marquee speed:** medium / editorial (~45s per cycle).
- **Marquee math:** track uses `width: max-content` so its own width equals the sum of the two copy widths. `translateX(-50%)` then translates by exactly one copy-width, producing a seamless wrap. Without `max-content` the track defaults to 100% of its parent (~100vw) and `-50%` becomes `-50vw`, which produces a visible mid-loop snap on most viewports.
- **Layout:** full-bleed (marquee track breaks out of footer's 80px side padding via negative margin); bottom meta row stays padded.
- **Trigger:** IntersectionObserver, threshold 0.3, plays once per component mount. Re-traces on fresh page navigation (Home → project page), not on scroll-up-and-back.
- **Reduced motion:** static single copy, no trace, no marquee. Matches today's footer-big resting appearance.

## Scope

### In scope
- `src/pages/ProjectDetail.tsx` — append `<Contact />` + `<Footer />` (lazy-loaded), warm chunks at idle.
- `src/components/layout/Footer.tsx` — replace the `motion.div.footer-big` block with `<FooterNameMarquee />`. Bottom meta row unchanged.
- `src/components/ui/FooterNameMarquee.tsx` — new component owning trace + cross-fade + marquee + reduced-motion fallback + a11y semantics.
- `src/index.css` — add `.footer-marquee*` rules (full-bleed track, two-copy flex layout, marquee keyframes, reduced-motion override). Keep or repurpose the existing `.footer-big` selector as needed for backwards-clean removal.

### Out of scope
- Changes to `HeroNameDrawing` — the hero behavior is unchanged.
- Changes to `MarqueeDivider` or any other section.
- Pause-on-hover, click-to-replay, or any other marquee interaction.
- Per-viewport marquee speed tuning (we accept the same 45s linear duration on all sizes).
- Multiple `NameCopy` count beyond 2.

## Architecture

### Component shape

```tsx
<Footer>
  <FooterNameMarquee />
  <div className="footer-bottom"> ... </div>   // unchanged
</Footer>

// FooterNameMarquee:
<>
  <h2 className="sr-only">{t('footer.bigText')}</h2>
  <div className="footer-marquee" aria-hidden>
    <div
      className={`footer-marquee-track footer-marquee-track--${phase}`}
      ref={trackRef}
    >
      <NameCopy refArray={copy1Refs} />
      <NameCopy refArray={copy2Refs} />
    </div>
  </div>
</>
```

`NameCopy` is an internal sub-component (not exported) that renders ONE SVG containing both kevin and shibuya glyphs in a single coordinate system. Shibuya's glyphs are wrapped in a `<g transform="translate(2900, 0)">` so the kevin/shibuya word gap (300 units) is encoded geometrically rather than via flexbox.

### State machine

A single `useState<'idle' | 'tracing' | 'marquee'>` drives the visual.

```
   IDLE  ──[in viewport ≥30%]──▶  TRACING  ──[copy 1 + copy 2 + 50ms breath]──▶  MARQUEE (∞)
                                                                                          │
                                                                  (reduced motion) ───────┘
                                                                  renders STATIC single copy
```

Phase determines: whether the marquee CSS animation is applied to the track, and whether 1 or 2 copies render (reduced-motion only renders 1). All path elements carry the same `footer-marquee-glyph` class throughout — there is no class change driven by phase.

### Trigger

`IntersectionObserver(threshold: 0.3, root: null)` on the track. First entry above threshold flips phase `'idle' → 'tracing'`. Observer disconnects after firing once.

### Cleanup contract

The component owns three effects (idle observer, tracing driver, reduced-motion layout effect). Each returns a cleanup that:
- disconnects the IntersectionObserver (idle effect)
- calls `cancelAnimationFrame` on the pre-trace RAF (tracing effect)
- clears the marquee `setTimeout` (tracing effect — safe no-op if the timer has already fired and triggered the phase change)

Mid-trace unmount → no leaks. Mid-marquee unmount → CSS animation halts naturally with element removal.

## SVG geometry per copy

```
viewBox: 0 -820 6990 1070
  ├─ kevin glyphs:   x=[0, 2600]                        // NAME_KEVIN.glyphs (5 paths)
  ├─ word gap:       300 units empty
  ├─ shibuya glyphs: <g transform="translate(2900,0)">  // NAME_SHIBUYA.glyphs.slice(0, 7) — period dropped
  │                    glyphs at x=[0, 3790]            //                                  (7 paths)
  │                  </g>
  └─ inter-copy gap: 300 units empty (baked into right edge of viewBox)
```

- **12 paths per copy**, **24 path refs total** across both copies.
- viewBox width breakdown: `2600 + 300 + 3790 + 300 = 6990` units.
- viewBox height breakdown: `NAME_ASCENT(820) + NAME_DESCENT(250) = 1070` units.
- The shibuya period glyph (`'.'`) is intentionally excluded — footer text is "kevin shibuya", not "kevin shibuya."

The SVG element has `height: 1em; width: auto; preserveAspectRatio: xMinYMid meet`. Width auto-scales from the viewBox aspect ratio. The marquee track lays out two copies with `display: flex; gap: 0; width: max-content` — the inter-copy gap is baked into each viewBox's right edge, and `width: max-content` makes the track size to its children's combined width so `translate3d(-50%, 0, 0)` translates by exactly one copy-width and produces a seamless wrap.

## Timing constants

```ts
const STAGGER_MS              = 80    // per-glyph stagger inside a copy (matches hero)
const TRACE_DUR_MS            = 800   // per-glyph dashoffset 1→0 (matches hero)
const PAUSE_BETWEEN_COPIES_MS = 120   // breath between copy 1 finishing and copy 2 starting
const MARQUEE_BREATH_MS       = 50    // pause after the last trace stroke before marquee scrolling
```

Resulting timeline (t=0 when IntersectionObserver fires):

```
t=0       copy 1 starts tracing    (k → e → v → i → n → s → h → i → b → u → y → a)
t=1680    copy 1 done              // (12 - 1) * 80 + 800
t=1800    copy 2 starts tracing    // 120ms breath
t=3480    copy 2 done
t=3530    phase flips to 'marquee' // 50ms breath
t=3530+   marquee CSS keyframes engaged
```

## Stroke state

The trace and marquee both render in `rgba(246, 249, 252, 0.25)` (cream-25%) at `stroke-width: 6`. There is no color or width transition between phases — only `stroke-dashoffset` animates (per-glyph, during TRACING). Fill is always `transparent`.

`stroke-dashoffset` is `1` (hidden) at mount, transitions per-glyph to `0` during TRACING, and then stays at `0` for the rest of the component's lifetime. The CSS rule for `.footer-marquee-glyph` declares dashoffset `1`; once a path's trace completes, its dashoffset is set imperatively to `0` and never modified again. No phase-conditional CSS class modifies the path styling.

## CSS

```css
/* Full-bleed marquee track — breaks out of footer's 80px gutter,
   bottom meta row keeps its padding. */
.footer-marquee {
  margin-left: -80px;
  margin-right: -80px;
  overflow: hidden;
  margin-bottom: 48px;
}
@media (max-width: 1100px) { .footer-marquee { margin-left: -40px; margin-right: -40px; } }
@media (max-width: 720px)  { .footer-marquee { margin-left: -20px; margin-right: -20px; } }

.footer-marquee-track {
  display: flex;
  flex-wrap: nowrap;
  gap: 0;
  width: max-content;          /* size to children for seamless -50% loop math */
  font-size: clamp(80px, 18vw, 280px);
}
.footer-marquee-track-copy {
  display: block;
  flex-shrink: 0;
  height: 1em;
  width: auto;
  overflow: visible;
}

.footer-marquee-glyph {
  fill: transparent;
  stroke: rgba(246, 249, 252, 0.25);
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
}

.footer-marquee-track--marquee {
  animation: footer-marquee-scroll 45s linear infinite;
  will-change: transform;
}
@keyframes footer-marquee-scroll {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-50%, 0, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .footer-marquee-track--marquee {
    animation: none;
    will-change: auto;
  }
}
```

## Reduced motion

When `useReducedMotion()` returns `true`:

- Initialize `phase` to `'marquee'` (skips IDLE / TRACING entirely).
- Render only ONE `NameCopy` (no second copy, no marquee row visually).
- Skip `IntersectionObserver` setup entirely — the trace will never run, so there's nothing to trigger.
- In a layout effect, imperatively set `pathLength=1`, `stroke-dasharray=1`, `stroke-dashoffset=0` on every path of the single rendered copy before first paint, so paths render in their final stroked state with no visible "draw" flash.
- All paths carry the `footer-marquee-glyph` class from mount (cream-25% stroke, stroke-width 6 — same styling used in every phase).
- The `@media (prefers-reduced-motion: reduce)` rule suppresses the marquee keyframes animation on the `--marquee` track class and resets `will-change` so a static element doesn't waste a GPU layer.

Net result: a single static cream-stroked "kevin shibuya" — visually identical to today's `.footer-big`, with no motion of any kind.

## Project Detail page changes

`src/pages/ProjectDetail.tsx`:
- Add lazy imports for `Contact` and `Footer` mirroring `Home.tsx`'s pattern.
- Wrap them in `<Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>`.
- Append below the existing `<div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>` (the live/source button row).
- Add a `useEffect` that warms both chunks at idle (`requestIdleCallback` with `setTimeout` fallback), matching `Home.tsx`.

The `<main className="section">` wrapper currently constrains the project content. Contact and Footer render their own full-section markup (Contact has `section--contact`, Footer has `<footer className="footer">`), so they need to render as siblings of `<main>` or we end up double-padding. Two implementation options for the plan to choose between:
1. Move the project content out of `<main className="section">` into a top-level `<>` fragment and render `<main>` only around the existing content, with Contact + Footer as siblings.
2. Close the project content `<main>` early and render Contact + Footer outside it.

Both achieve the same visual result. Option 1 is structurally cleaner; the plan should pick.

## Accessibility

- `<h2 className="sr-only">{t('footer.bigText')}</h2>` carries the semantic heading.
- `.footer-marquee` container has `aria-hidden="true"`.
- Each `NameCopy` SVG has no role/label (decorative, inherits aria-hidden from parent).
- Bottom meta row (copyright, built-with) is unchanged.

## Testing strategy

This component is mostly visual + DOM-imperative. UI components in this project skip unit tests per CLAUDE.md, but acceptance criteria below must be visually verified before claiming complete:

1. `npm run build` clean — no TS errors, no warnings.
2. `npm run dev`, Home: scroll to footer, observe trace (copy 1 then copy 2 in blue, sequential), coordinated cross-fade to cream-25%, then marquee starts.
3. Watch one full marquee cycle on Home — confirm seamless wrap, no visible jump.
4. Navigate Home → `/projects/<slug>` — Contact + Footer render below project content; scroll down, trace plays again.
5. On project page: scroll up and back down — trace does NOT replay (once-per-mount semantics).
6. Mobile width (≤720px): full-bleed holds (no 80px gutter visible), trace + marquee still work.
7. Toggle `prefers-reduced-motion` in Chrome devtools — single static "kevin shibuya" only, no animation, matches today's footer-big.
8. EN/PT toggle — `footer.bigText` is "kevin shibuya" in both locales (already), no behavioral difference.

vitest/jsdom doesn't run SVG layout, so the component feature-detects `getBBox` (mirroring `HeroNameDrawing`) and short-circuits to the `'marquee'` phase in tests.

## TODO

> The wording below reflects the original design. The trace color, cross-fade phase, and stroke-width transitions described in items 6 and elsewhere were dropped during verification — see "Locked decisions" above for what was actually shipped.

- [x] Lazy-load `Contact` and `Footer` in `src/pages/ProjectDetail.tsx`, append below the live/source button row, wrap in `Suspense`, warm chunks at idle.
- [x] Create `src/components/ui/FooterNameMarquee.tsx` with the three-phase state machine (`idle | tracing | marquee`), two `NameCopy` SVGs, IntersectionObserver trigger, full cleanup, reduced-motion guard, and a11y `sr-only h2`.
- [x] Add `.footer-marquee*` rules to `src/index.css` (full-bleed track with `width: max-content`, two-copy layout, single cream-stroke glyph rule, marquee keyframes, reduced-motion override) and remove the old `.footer-big` rules now that the component is replaced.
- [x] Replace the `motion.div.footer-big` block in `src/components/layout/Footer.tsx` with `<FooterNameMarquee />`; bottom meta row unchanged.
- [x] `npm run build` produces a clean build (no TS errors, no warnings).
- [x] Visual verification on Home: cream-25% trace (sequential 2 copies), seamless marquee wrap. *(No cross-fade beat — see revised "Locked decisions".)*
- [x] Visual verification on `/projects/<slug>`: Contact + Footer render below project content; trace plays on scroll-into-view; does not replay on scroll up/down within the same mount.
- [x] Visual verification at ≤720px viewport: full-bleed, trace + marquee still function.
- [x] Visual verification with `prefers-reduced-motion: reduce`: single static "kevin shibuya", no trace, no marquee.
