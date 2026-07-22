# HANDOFF — pre-Plan-2 punch list CLEARED; next: author Plan 2

> Written 2026-07-18 (supersedes the punch-list handoff of the same date).
> All 9 punch-list items are committed or decided. Plan 2 authoring is the next move.

## Goal

Author Plan 2 (timeline + goes-to-press wipe) for the press-revamp spec via
superpowers:writing-plans, then execute SDD-style. The pre-Plan-2 baseline is now clean
and all decisions are recorded.

## State

- **Branch:** `design/work-first-press-revamp`, clean tree, NOT pushed/merged (decision:
  keep stacking Plans 2-4 here; merge to main only when below-hero is no longer transitional).
- **Punch list (all done, one commit each on top of `41b6f7f`):**
  1. three.js split out of the eager portrait chain (`HalftoneCanvas.tsx` lazy chunk, 240 KB
     gzip, live path only; Byline chunk now 1.1 KB gzip) + Canvas mounts once on first
     intersect (no re-entry GL/shader thrash). Source-scan test pins the three-free chain:
     `tests/unit/canvas/halftone-fallback-chunk.test.ts`.
  2. Byline reduced-motion e2e (img fallback present, zero canvas) in `reduced-motion.spec.ts`.
  3. `.section-index` on sand → new `--blue-600 #1965B4` (4.92:1), scoped to `.section--sand`.
     a11y is 100 now (verified 3×). Full contrast audit in the commit message.
  4. Grain drift → composited translate3d one-tile loop + IO pause off-screen
     (`data-offscreen`, stamped imperatively — never setState). Pointermove listener
     attaches/detaches on the same IO. Verified on preview: running on-screen, paused off.
  5. (folded into 1)  6. (folded into 4)  7. Scramble code deleted (component/hook/test/CSS).
  8. Spec now records the durable budget: perf ≥85 + LCP ≤2.6s + a11y 100 (guardrails section).
  9. Branch decision recorded in spec.  10. Owner deliverables still open (portrait, handwriting
     note, published-count confirmation — blocks Plan 4's masthead only).
- **Spec:** `docs/superpowers/specs/2026-07-17-work-first-press-revamp-design.md` — budget +
  branch decisions added to guardrails. TODO ticks unchanged (1/2/5/12 done).
- **Locked interfaces for Plan 2 (unchanged):** `HalftoneMaterial` uniforms/defaults (mode 1
  wipe authored, no consumer) and `HalftonePortraitProps`. NEW: the live-shader subtree now
  lives in `src/canvas/halftone/HalftoneCanvas.tsx` (lazy); keep three imports out of the
  eager chain — the source-scan test enforces it.

## Verification (2026-07-18)

- Unit 91/91 (20 files) · tsc clean · lint 0 errors (9 pre-existing warnings) · build green.
- Full e2e 27 passed / 1 skipped (pre-existing skip) on fresh `npx vite preview --port 4173`.
- Lighthouse mobile: **a11y 100** (was 96; verified 3×, deterministic). **LCP 2.6s** invariant
  held on the cleanest run. **Perf score inconclusive**: host was under load avg 11 (macOS
  legacyScreenSaver at 85% CPU) — runs read 84 → 64 tracking load, not code. Deterministic
  perf guards green (CLS 0, no long tasks >200ms). RE-MEASURE perf once on an idle machine
  before Plan 2's baseline table; expect ≥ baseline 88 (mobile now fetches 240 KB gzip less).

## What worked / what didn't

- **Gotcha (cost ~15 min):** `vite preview` (sirv, production mode) snapshots dist at startup —
  after a rebuild it 404s new hashed assets to index.html (MIME error, blank page, all e2e
  red). ALWAYS restart the preview server after `npm run build`.
- Port 5173 was serving a DIFFERENT app ("forge" dashboard — another project's dev server).
  Don't assume 5173 is the portfolio; e2e/preview use 4173.
- Lighthouse on a loaded host (screensaver running) is garbage — check `uptime` before
  trusting a score; a11y is load-independent, perf is not.
- Scratchpad node scripts can't resolve project deps — import playwright by absolute path
  `$PWD/node_modules/playwright/index.mjs`.

## Verify

```bash
cd ~/keki/dev/personal_projects/portfolio
git log --oneline -7        # punch-list commits on top of 41b6f7f
npm run test:unit           # 91/91
npx tsc -b --noEmit && npm run lint
npm run build && npx vite preview --port 4173   # fresh server!
npx playwright test         # 27 passed / 1 skipped
```

## Next action

1. (5 min, idle machine) Re-run Lighthouse mobile on `npx vite preview --port 4173` to pin
   the perf baseline number for Plan 2's table (expect ~88+; budget is ≥85 + LCP ≤2.6 + a11y 100).
2. Author Plan 2 (timeline + wipe) via superpowers:writing-plans. Apply the codified rules:
   full-e2e baseline before Task 1, measured budgets at plan time, contrast audit for any
   token-touching change (watch: blue-400 on sand is only 2.61:1 — fails even large-text AA;
   currently unused on sand, don't introduce it there), plan-review gate (fresh Opus + codex)
   before execution.
