# Page Animations — Per-task Retros

Captured per task as we go. Format: 3–5 sentences each. Lessons that matter are promoted to memory or CLAUDE.md immediately, not just logged here.

---

## Task 0 — Test infrastructure

- **What worked:** Single-shot dispatch with full step-by-step plan text was sufficient for a config-only task. Spec+quality reviews caught real issues (Vitest 4.x exit-1 behavior, missing `tests/{unit,e2e}` stub dirs, `test-results/` not in `.gitignore`).
- **What to repeat:** Dependency installs and config files map cleanly to a single mechanical implementer. Sonnet was the right model.
- **What to change:** I should have set up `tests/{unit,e2e}/.gitkeep` in the original plan rather than relying on the reviewer to catch it.
- **Promoted to repo:** Vitest 4.x compatibility (`passWithNoTests` in config, not script).

## Task 1 — Motion primitives

- **What worked:** Reviewer caught two real bugs in the plan itself: (1) `sectionEnterDefaults.ease` was a CSS bezier string passed to GSAP (silent fallback), (2) `loaderDone` Promise via `useMemo([])` would orphan in StrictMode.
- **What to change:** Both bugs were *in the plan* — the implementer faithfully followed the plan and reproduced the latent bugs. Plans need a "GSAP eases must use GSAP-native names" note when GSAP and Framer Motion both consume eases.
- **Promoted to repo:** CLAUDE.md gained a "Spec & Plan Checkbox Discipline" section after I noticed I'd been completing steps without ticking their `- [ ]`.
- **Cost:** ~1 implementer + 2 reviewers + 1 self-fix + 1 verifier = 5 subagent dispatches. The reviewer catch was worth it but the verifier was probably overkill for two surgical line-edits.

---

## Task 2 — Loader → hero handoff

- **What worked:** Asking the implementer to "iterate beyond the literal Step 4 code" up front, with the bbox-continuity discrepancy flagged in the dispatch, paid off — the implementer pivoted to a runtime `getBoundingClientRect` offset (FLIP-style) without needing a follow-up round-trip. Combined spec+quality review (one dispatch instead of two) was sufficient and saved tokens.
- **What to change:** The first dispatch ran `frontend-design` and reported its design output but didn't actually write the files — I had to redispatch a "now actually implement it" agent. Lesson: when invoking a domain skill from inside an implementer dispatch, explicitly say "use its output to build the files in this same task." Caught two real Important issues post-implementation: (1) `useLayoutEffect` measured before `document.fonts.ready` (cold-load font race that the test cache masks), (2) `data-hero-eyebrow` had to move from `.hero-role-line` to `.hero-supplementary` because `getComputedStyle.opacity` doesn't inherit through the cascade.
- **Promoted to repo:** Plan now carries an explicit "implementation note" documenting the clip-path → measurement deviation so future readers don't get confused.
- **Cost:** ~3 implementer dispatches (one stalled, one continuation, plus the pre-fix work) + 1 combined reviewer + 0 self-fixes for Important issues (did directly). End state: 4/4 Playwright tests green on desktop + mobile.

(Tasks 3–10 retros land here as they complete.)
