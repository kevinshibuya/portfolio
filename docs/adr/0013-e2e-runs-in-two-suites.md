# The e2e suite runs as a quick suite and a full suite

A full e2e run took about 22 minutes of test time on 2026-10-06, before builds: every spec twice (desktop and mobile), `frieze-surface` three times, at `workers: 1`, in five memory-safe chunks that each rebuilt the site and restarted `wrangler dev`. The cost fell on every PR's fix loop, and the timing-sensitive specs failed under machine load while the diff under test shipped byte-identical bytes.

Kevin's ruling, 2026-10-06, over a grilling round:

- **The quick suite** runs in a PR's fix loop, desktop only: `scene-scrub` (the only guard for canvas runtime errors), `stream`, `scene-no-webgl`, `frieze-surface`, `pixel-gate` (the hero's sole visual judge, ADR 0007), `scene-reduced-motion`, and one `smoke.spec.ts` that absorbs `dark-tokens`, `hero-shader`'s mount test and the canvas budget, with every assertion carried over.
- **The full suite** runs everything, once on a PR's final head before the `staging` merge, and before any release. A bare `npx playwright test` is the full suite: the config comment's rule stands that the default is what handoffs and agents actually type, so the default must be the safe one.
- **Mobile runs only where the viewport changes behaviour:** `scene-scrub`, `stream`, `frieze-surface`, `frieze-click`, `light-chapter`, `nav-on-light`, `hero-dissolve` and `pixel-gate`. `desktop-hidpi` stays scoped to `frieze-surface`.
- **Perf timing assertions** (long tasks, frame times) move behind `PERF_HARNESS`. The deterministic perf checks stay in the full suite.
- **One build per run:** `scripts/e2e.sh quick|full` kills 4173, builds once, starts one server, runs the chunks against it, and stops it.
- **`workers: 1` stays.** Both reasons in the config comment still hold; the savings come from running less, not from running in parallel.

## Considered and rejected

- **Deleting specs as duplicates of unit tests.** Read closely, `nav-on-light` guards the nav flip and back-nav re-arm, `contact-waves` guards the canvas budget behind the no-fourth-canvas rule, and `rows-hover` guards the accordion's single-open behaviour. None is covered elsewhere. Only the console-clean mount checks were true duplicates, and those merge into the smoke.
- **One reduced-motion spec.** Each reduced-motion test checks a different surface's static frame; merged, they save no page loads and blur which surface broke. They stay per surface and lose their mobile runs instead.
- **A bare run meaning the quick suite.** Faster by default, but the full suite would then depend on someone remembering it.
- **More workers.** The pixel gate is calibrated at one and asserts it.

## Consequences

- A regression that shows only on a phone, in a surface outside the mobile list, is caught by nothing until a person looks. The list is the bet on where viewport-specific behaviour lives; a new viewport-dependent surface joins it in the same PR.
- A regression outside the quick suite surfaces at the full run before the merge, not in the fix loop. The fix loop gets faster at the cost of a later, rarer red.
- Perf timing regressions are caught only by the perf harness (issue #11), on a quiet machine.

## Source

`playwright.config.ts`, `scripts/e2e.sh`, `CLAUDE.md` ("Verification"), `CONTEXT.md` ("Quick suite", "Full suite")
