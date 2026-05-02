# Page Feel Overhaul — Cinematic Animations, Smooth Scroll, Typography, Hero Declutter

**Date:** 2026-05-02
**Scope:** Single coordinated pass that changes how the site *feels* across four interacting concerns: enter-animation system, smooth-scroll behavior, typography & spacing rhythm, and Hero composition.
**Reference:** `/Users/luizarazzera/Desktop/keki/dev/personal_projects/hotmart-bunde` — the user identified its animation organicness, scroll smoothing, typographic breathing room, and Hero focus as the target feel.

---

## Motivation

The previous animation system (spec `2026-04-25-page-animations-design.md`) shipped a working scroll-reveal foundation, but the resulting feel is too fast, too uniform, and not cinematic — every section uses the same `fade-up` recipe at `0.6s` with a cubic-bezier ease, so the page reads as one flat run of identical reveals. The Hero compounds the problem by packing six competing zones (duo-name, role line, description, CTAs, stats row, and a dense GSAP-driven editorial collage on the right) into the first viewport, leaving the eye no place to land.

The reference project achieves "clean and cinematic" through three specific moves: **(1)** spring physics over fixed easing, **(2)** a small library of distinct enter recipes mapped to content type rather than one universal recipe, **(3)** Lenis-based smooth scroll that decouples scroll smoothing from animation triggering. This spec ports those moves while preserving the soft-blue editorial design language (Plus Jakarta Sans, cream/blue palette, lowercase voice).

---

## Locked decisions (from brainstorm)

1. **Hero composition:** keep duo-name, role line, description, two CTAs, and the rotating R3F `HeroAccent3D`. Cut `HeroDataFragments` (the SVG editorial collage) entirely. Relocate the 3-stat row to between WorkExperience and Skills.
2. **Animation engine:** pure Motion (Framer Motion's successor name) with spring physics. Remove GSAP and ScrollTrigger from the dependency tree — once `HeroDataFragments` is gone, nothing in the codebase needs them.
3. **Smooth scroll:** Lenis, matching the reference's config (`lerp: 0.1`, `smoothWheel: true`, `smoothTouch: false`). Bypassed entirely under reduced-motion.
4. **Typography & spacing:** spacing rhythm + selective type tightening + bold inline emphasis pattern. **No font swap, no color change** — the soft-blue editorial language is preserved.

---

## Design

### 1. Hero composition

**Stays:** duo-name (`kevin / shibuya.` with ghost-outline second line), role line (`i am an [interactive storyteller]` with the cycling roles, 2.8s interval, 0.45s fade), description paragraph, two CTAs (`collaborate` primary + `resume` ghost), `HeroAccent3D` rotating R3F canvas, `HeroAccentSilhouette` fallback, `useScramble` effect on the second name line.

**Removed:** `HeroDataFragments` component (bars, line graph, dot lattice, "47" outline, "FIG. 01 — 2026" label). The 3-stat row is removed from the Hero and re-placed (see §5).

**Layout:** 2-column grid, ~60/40 split desktop, single column mobile. Left column gets a `max-w-[640px]` constraint on the description. Right column holds only `HeroAccent3D`, vertically centered, with significant empty space around it.

**Vertical rhythm inside the left column:** name → role line `48px` gap, role line → description `32px` gap, description → CTA pair `48px` gap.

**Hero choreography** (staged on mount, not scroll-driven — this is the only above-the-fold section so it never enters via scroll):

| Step | Element | Recipe | Trigger time (ms after mount) |
|---|---|---|---|
| 1 | Name | `stampIn` | 180 |
| 2 | Role line | `slideInLeft` | 520 |
| 3 | Description | `fadeUp` | 780 |
| 4 | CTA pair | `scaleIn` (staggered 80ms) | 1040 |
| 5 | `HeroAccent3D` (entry only — internal R3F rotation runs independently and continuously) | `fadeUp` | 1280 |

### 2. Animation system

**Spring presets** (lifted from the reference; tune after seeing on the page):

| Preset | Stiffness | Damping | Mass | Used for |
|---|---|---|---|---|
| `gentle` | 100 | 20 | 1.0 | default — natural settle |
| `snappy` | 300 | 30 | 0.8 | punchier scale/stamp entrances |
| `soft`   | 80  | 25 | 1.2 | slowest — big bento cards & footer wordmark |

**Recipe library:**

| Recipe | Initial → Animate | Spring | Used for |
|---|---|---|---|
| `fadeUp` | `opacity 0, y +40` → `opacity 1, y 0` | gentle | description paragraphs, body copy, generic enters |
| `scaleIn` | `opacity 0, scale 0.85` → `opacity 1, scale 1` | snappy | CTAs, pills, badges, small accents |
| `stampIn` | `opacity 0, scale 1.15, blur 2px` → `opacity 1, scale 1, blur 0` | snappy | section headings, hero name, numbered column titles, stats |
| `cardReveal` | `opacity 0, y +30, scale 0.96` → `opacity 1, y 0, scale 1` | soft | bento project cards, embed preview tiles |
| `slideInLeft` | `opacity 0, x -32` → `opacity 1, x 0` | gentle | numbered rows, accordion rows, role line |
| `slideInRight` | `opacity 0, x +32` → `opacity 1, x 0` | gentle | counterweight elements, About portrait |

**Recipe → section mapping:**

| Section | Heading | Body / list / cards | Notes |
|---|---|---|---|
| Hero | `stampIn` (name) | per choreography table above | staged on mount |
| WorkExperience | `stampIn` | rows `staggerContainer` of `slideInLeft` (100ms stagger). Accordion expand stays Framer `AnimatePresence` height-auto | |
| Stats | none | `staggerContainer` of `stampIn` (120ms stagger). Numerals count up via `animate(0, target)` driven by `useInView`, ~1.4s | new placement, see §5 |
| Skills | `stampIn` | three numbered columns as `staggerContainer` of `slideInLeft` (120ms between columns, 60ms between items inside each column) | |
| Projects | `stampIn` | cards `staggerContainer` of `cardReveal` (100ms stagger). The `lg` (2×2) card gets the stagger lead so it lands first as the anchor | |
| EmbedsGallery | `stampIn` | rows `staggerContainer` of `slideInLeft` (50ms stagger — many rows, faster cadence) | |
| Contact | `stampIn` | body/links `fadeUp`, submit button `scaleIn` | |
| Footer | none | wordmark `fadeUp` with `soft` spring (slowest settle, punctuates page end) | |

**Trigger model:** all section enters use Motion's `whileInView` with `viewport={{ once: true, amount: 0.2 }}`. Hero is the only section using a staged-timeline-on-mount.

**Reduced motion:** existing `useMotion` context + `prefersReducedMotion` flag preserved. When reduced, every recipe collapses to `opacity 0 → 1` over 200ms, no transform/blur, no stagger.

### 3. Smooth scroll (Lenis)

**Provider:** `src/components/layout/SmoothScroll.tsx` wraps the routed content in `App.tsx`. Instantiates Lenis once on mount, runs the RAF loop, cleans up on unmount.

**Config:**
```ts
{
  lerp: 0.1,
  smoothWheel: true,
  smoothTouch: false, // preserve native iOS momentum + pull-to-refresh
}
```

**Anchor integration:** existing `scrollIntoView({ behavior: 'smooth' })` calls in nav links and the hero scroll cue migrate to `lenis.scrollTo('#section-id', { duration: 1.2 })`. A small `useLenis()` hook exposes the instance from context.

**Reduced motion:** when `prefersReducedMotion` is true, `SmoothScroll` does not instantiate Lenis at all — falls back to native scroll. Anchor handlers detect the absence and use `window.scrollTo({ behavior: 'auto' })`.

### 4. Typography & spacing

**Type ramp adjustments** (in `src/index.css`):

| Element | Current | New |
|---|---|---|
| Hero name | `clamp(72px, 13vw, 220px)`, lh `0.88` | `clamp(64px, 11vw, 192px)`, lh `0.92` |
| Section title | `clamp(44px, 6vw, 84px)` | unchanged |
| Role prefix | `clamp(20px, 2.2vw, 32px)`, w `300` | `clamp(22px, 2.4vw, 36px)`, w `300` |
| Role active | `clamp(22px, 2.4vw, 36px)`, w `600` | `clamp(24px, 2.6vw, 40px)`, w `600` |
| Hero description | `17px / 1.6 / lowercase` | `17px / 1.75 / lowercase` |
| Section description | `17px / 1.6` | `17px / 1.7` |
| Button | `12px`, padding `13px 22px` | `13px`, padding `16px 28px` |
| Stat value | `32px / w 600` | `40px / w 700` |
| Stat label | `11px / 0.08em ls` | unchanged |

**Spacing rhythm changes:**

| Surface | Current | New |
|---|---|---|
| Section padding (top/bottom desktop) | `140px` | unchanged |
| Heading → content gap inside a section | `64px` | `96px` (new utility class) |
| Hero name → role line gap | tight | `48px` |
| Role line → description gap | default | `32px` |
| Description → CTA pair gap | default | `48px` |
| Container max-width | `1440px`, side padding `80px` | unchanged |
| Inner paragraph max-width on hero & section descriptions | unconstrained | `~640–680px` (new `max-w-[640px]` utility on description JSX) |

**Bold-emphasis inline pattern:** existing italic blue-400 `<em>` convention for in-line accents in section titles **stays**. New complementary convention for **body copy** — semantic `<strong>` element gets globally-styled weight bump from `400 → 600` in `text-ink` color (not blue, not italic — distinct from `<em>`). Each paragraph can now have two or three weight peaks instead of one flat run. Applied to hero description, project descriptions, and selected section descriptions.

**i18n implication:** any string with embedded `<strong>` switches from `t('key')` to `<Trans i18nKey="key" components={{ strong: <strong /> }} />`. Strings without emphasis stay as plain `t()`.

### 5. Stats relocation

**New section flow:**
```
Hero → About → WorkExperience → Stats (new position) → Skills → Projects → EmbedsGallery → Contact → Footer
```

**Composition:** slim band, no heading, no eyebrow, no description. Three numbers, large and confident, reading as a coda to WorkExperience. Layout: 3 columns desktop, stacked mobile, centered horizontally inside the 1440 container. Padding `py-32` (slim — not the full `140px` section pad). Stat values `40px / weight 700` (per §4). Labels stay `11px / 0.08em letter-spacing`.

**Animation:** each stat enters via `stampIn` with 120ms stagger. On enter, numerals count up from `0` to target value over ~1.4s using Motion's `animate(0, n)` driven by `useInView`. Reduced-motion: numerals appear at final value with the 200ms opacity-only fade.

**Dividers:** `MarqueeDivider` is not currently rendered anywhere in `Home.tsx` (the component exists but isn't placed). No divider work in this spec — Stats slots in directly between `<WorkExperience />` and `<Skills />`.

---

## Surfaces touched

**Added:**
- `src/components/sections/Stats.tsx`
- `src/components/layout/SmoothScroll.tsx`
- `src/hooks/useLenis.ts`
- `src/components/ui/Stagger.tsx`
- `lenis` in `package.json`

**Modified:**
- `src/utils/animations.ts` — rewritten (`SPRINGS`, `VARIANTS`, `STAGGER_PRESETS`, `staggerContainer()` factory)
- `src/components/ui/RevealOnView.tsx` — adds `recipe` and `delay` props (default behavior preserved)
- `src/components/sections/Hero.tsx` — removes `HeroDataFragments` + stats row, applies new gap utilities + max-w on description, switches to staged-timeline mount animation
- `src/components/sections/{WorkExperience,Skills,Projects,EmbedsGallery,Contact}.tsx` — adopt new recipes, `max-w` on descriptions, `<Trans>` for `<strong>` strings
- `src/components/ui/SectionHeading.tsx` — remove `useScrollFade(titleRef)` call (and the import); the heading-fade-on-exit behavior is intentionally dropped (see §6, item 1)
- `src/components/layout/Footer.tsx` — wordmark `fadeUp` with `soft` spring
- `src/components/layout/Header.tsx` (and any nav component) — anchor links migrate to `lenis.scrollTo` via `useLenis()`
- `src/components/layout/LoadingScreen.tsx` — migrated off GSAP (`useGSAP` / `gsap.timeline` / `gsap.set` → Motion's `animate()` + direct `style.transform`); kept visually identical (loader hold + 0.4s fade + runtime hero-word offset). See §6 item 5.
- `src/pages/Home.tsx` — section ordering updated to insert `<Stats />` between `<WorkExperience />` and the divider before `<Skills />`
- `src/i18n/locales/{en,pt}.json` — selected key strings get `<strong>` markup
- `src/index.css` — clamp/line-height/button updates, global `strong` style, new heading→content `96px` spacing utility
- `src/App.tsx` — wraps the routed content in `<SmoothScroll>` provider
- `tests/unit/bundle-deps.test.ts` — update the `allowed` set: remove `gsap` and `@gsap/react`, add `lenis`
- `package.json` + `package-lock.json` — add `lenis`, remove `gsap` and `@gsap/react`

**Deleted:**
- `src/components/canvas/HeroDataFragments.tsx`
- `src/hooks/useScrollFade.ts` — confirmed three consumers (`Hero.tsx`, `SectionHeading.tsx`, `Contact.tsx`); each call site is removed first, then the hook file is deleted. The scroll-progress-driven heading-fade-on-exit behavior is intentionally dropped in this spec (will be redesigned in a future spec).
- `tests/unit/useScrollFade.test.ts` — deleted alongside the hook

---

## Verification approach

- **Runtime-deps test** (`tests/unit/bundle-deps.test.ts`) updated: removes `gsap` and `@gsap/react`, adds `lenis`. Test asserts exact dependency surface, so it's a hard signal if either is wrong.
- **Type check + build:** `npm run build` passes with no TS errors.
- **Visual sweep in dev:** open `npm run dev`, scroll full page top → bottom, verify each section's enter recipe matches the mapping, verify Hero staged choreography (180/520/780/1040/1280ms), verify Stats count-up triggers at the right moment.
- **Reduced motion:** Chrome DevTools → Rendering panel → emulate `prefers-reduced-motion: reduce`. Confirm all recipes collapse to 200ms opacity fade with no transform/blur, Lenis is bypassed entirely (native scroll restored).
- **Mobile:** test on iOS Safari (or DevTools touch emulation). Confirm `smoothTouch: false` preserves native momentum and pull-to-refresh works.
- **Lighthouse mobile:** re-run, target ≥ 91 (current baseline from commit `df07009`). Removing GSAP should outweigh adding Lenis.
- **Anchor links:** click each nav item (work / interactives / experience / skills / contact). Confirm Lenis-driven smooth scroll lands on the correct section.

---

## Out of scope

- Font family swap (Plus Jakarta Sans stays)
- Color palette changes (soft-blue editorial language stays)
- Nav layout changes (Header untouched aside from anchor handler migration)
- New sections (Stats is relocated, not new content; no About is added — see §6)
- R3F changes to `HeroAccent3D` (untouched)
- `MarqueeDivider` work — component exists but isn't placed in `Home.tsx` today; left alone
- Re-enabling GSAP for any future bespoke moment (will be reintroduced if and when a single editorial moment justifies it; not in this spec)
- Replacement of the section-heading scroll-fade behavior that is dropped here (see §6, item 1) — explicitly deferred to a future spec

---

## 6. Codebase corrections (post-brainstorm reality check)

These deviations from the brainstorm assumptions were discovered when reading the actual codebase before writing the implementation plan. The spec above already reflects them; this section explains them for reviewers and future-you.

1. **`useScrollFade` was load-bearing on three call sites**, not one. It currently drives a subtle scroll-progress opacity fade on the Hero name (`Hero.tsx`), every section heading via `SectionHeading.tsx`, and the contact heading (`Contact.tsx`). Decision: **drop the behavior** in this spec (delete the hook + remove all three call sites). The user will redesign the heading-exit treatment in a separate future spec.
2. **No `About` section exists** in `src/components/sections/`. CLAUDE.md mentions one but it is not implemented. All About-specific tasks have been removed from this spec.
3. **`MarqueeDivider` is not placed anywhere in `Home.tsx`** today. The component exists but no JSX renders it. No divider work in this spec.
4. **Test layout:** unit tests live at `tests/unit/` (not `src/__tests__/`); the runtime-deps test is `tests/unit/bundle-deps.test.ts`.
5. **`LoadingScreen.tsx` uses GSAP heavily** (caught after Task 1 broke the build with a missing `projectEaseGsap` export). It uses `useGSAP` from `@gsap/react`, a `gsap.timeline()` for the panel fade-out, and `gsap.set()` for both the runtime hero-word offset measurement and the reduced-motion fast path. Decision: **migrate it off GSAP** (added as plan Task 7.5) — port the timeline to Motion's `animate()` and the offset to direct `style.transform`. Honors the spec's locked "drop GSAP entirely" decision. A one-line `projectEaseGsap = 'power3.out'` re-export was added to `animations.ts` (commit `2780fe8`) as a backwards-compat shim to keep the build green during the migration window; Task 7.5 removes it.

---

## TODO

- [ ] `HeroDataFragments.tsx` deleted; no remaining imports anywhere in `src/`
- [ ] `useScrollFade(...)` calls removed from `Hero.tsx`, `SectionHeading.tsx`, and `Contact.tsx` (3 call sites + their imports)
- [ ] `src/hooks/useScrollFade.ts` deleted; `tests/unit/useScrollFade.test.ts` deleted
- [ ] `LoadingScreen.tsx` migrated off GSAP — `useGSAP` / `gsap.timeline` / `gsap.set` replaced with Motion's `animate()` + direct `style.transform`; visually identical to before; reduced-motion path preserved
- [ ] `gsap` and `@gsap/react` removed from `package.json` + `package-lock.json` + the `allowed` set in `tests/unit/bundle-deps.test.ts`; the `projectEaseGsap` shim in `animations.ts` removed
- [ ] `lenis` added to `package.json` and to the `allowed` set in `tests/unit/bundle-deps.test.ts`
- [x] `src/utils/animations.ts` rewritten to export `SPRINGS`, `VARIANTS`, `STAGGER_PRESETS`, and `staggerContainer()` factory; old GSAP/duration constants removed
- [x] `RevealOnView` accepts `recipe` and `delay` props; default call sites unchanged in behavior
- [ ] New `<Stagger>` component implemented and used by every section that maps to a `staggerContainer` recipe
- [ ] Hero left column uses staged-timeline mount choreography with the 180/520/780/1040/1280ms timings; stats row removed from Hero JSX; description constrained to `max-w-[640px]`; new `48px / 32px / 48px` vertical gaps applied
- [ ] WorkExperience, Skills, Projects, EmbedsGallery, Contact each apply their assigned recipes per the mapping table
- [ ] `<Stats />` section component implemented as slim band with `stampIn` stagger + count-up numerals; placed in `Home.tsx` between `<WorkExperience />` and `<Skills />`
- [x] `SmoothScroll` provider implemented with `lerp: 0.1`, `smoothWheel: true`, `smoothTouch: false`; wraps routed content in `App.tsx`; bypassed when `prefersReducedMotion` is true
- [ ] `useLenis()` hook implemented and consumed by all anchor-link handlers (nav items + hero scroll cue); falls back to `window.scrollTo` when Lenis is absent
- [x] Type ramp updates applied in `index.css`: hero name `clamp(64px, 11vw, 192px)` lh `0.92`, role prefix/active grown, hero/section description line-heights `1.75`/`1.7`, button `13px / 16px 28px`, stat value `40px / w 700`
- [ ] New heading→content `96px` spacing utility applied in every section
- [x] Global `strong` style added to `index.css` (weight 600, ink color, no italic)
- [ ] `<Trans>` migration completed for every i18n string containing `<strong>`; selected emphasis applied in hero description, project descriptions, and section descriptions per §4
- [ ] Reduced-motion behavior verified manually in DevTools: every recipe → 200ms opacity fade only; Lenis fully bypassed
- [ ] `npm run build` passes with no errors
- [ ] `npm run test:unit` passes (bundle-deps + useScramble; useScrollFade test is deleted)
- [ ] Lighthouse mobile ≥ 91
- [ ] Visual smoke test approved by user (screenshot or live dev session)
