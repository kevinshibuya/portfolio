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

## Task 3 — Hero data-fragments composition entry

- **What worked:** Lean dispatch (plan-path reference + ≤250-word report cap + explicit "use frontend-design output to build files in this same task" guardrail) produced one clean implementer pass with zero round-trips. Combined spec+quality review caught two real Important issues — duplicate `numeric` scale tween (would have caused a one-frame snap) and missing rejection handler on `loaderDone.then` (cosmetic but worth aligning) — plus a useful nit (5-row CSS comment).
- **What to change:** Plan had an off-by-one on `grid-template-rows` (`repeat(4, 1fr)` couldn't fit bars span-3 + line span-2). Implementer correctly extrapolated to `repeat(5, 1fr)` without escalating, but I should sanity-check span-arithmetic when writing future grid layouts in plans. Also: scratch a hardcoded `waitForTimeout(1400)` lives in the e2e test — flagged for Task 9 perf pass to replace with a deterministic "timeline complete" signal.
- **Self-fix path:** Both Important issues were ≤2-line edits + a CSS comment — handled directly instead of round-tripping. Saved one full implementer dispatch (~the lean-token win we wanted).
- **Promoted to repo:** Nothing process-level; both findings were code-local. Pre-emptive `.catch(() => {})` on `loaderDone.then` in Hero.tsx applied for consistency.
- **Cost:** 1 implementer (sonnet) + 1 combined reviewer + 0 self-fix dispatches = 2 dispatches, vs ~5 for Task 2. Workflow tightening landed.

## Task 4 — Hero fragments scroll-linked motion

- **What worked:** Lean dispatch held its form (1 implementer + 1 combined reviewer + self-fix). Implementer correctly extrapolated the plan code, ran the failing test first, and patched the plan's missing mobile-skip guard. Reviewer caught a real Important issue: parallax tweens registered synchronously while entry timeline registered async after `loaderDone`, creating an ambiguous-ownership window for shared properties (`bars rect scaleY`). Even though body-scroll-lock during loader meant no actual conflict could fire today, the fix (move parallax registration *inside* `loaderDone.then(...)`) is cleaner and survives future loader changes.
- **What to change:** Implementer ticked spec TODO #3 themselves despite the dispatch saying "DO NOT touch the spec file." Future dispatches need a stronger guardrail — possibly listing the spec file path under an explicit "files you must not modify" header. Net effect was harmless this time (the box was correctly ticked), but the rule exists for a reason: spec ticks happen *only* after the controller-driven review pass.
- **Self-fix:** Race fix + lattice `setAttribute` batching (only mutate prev/next dot, not all 35 per frame) + bumped flaky 150ms test settle to 450ms. ~25 lines of edits, no round-trip.
- **Promoted to repo:** None — both findings are code-local.
- **Cost:** 1 implementer (sonnet) + 1 reviewer + 1 self-fix = 2 dispatches. Holding the cost line.

## Task 5 — `shibuya.` soft scramble hover

- **What worked:** First Vitest task in the project — explicit test-fragility warnings in the dispatch (rAF + fake timers, performance.now mocking, tabIndex tab-order considerations) paid off. Implementer used `vi.useFakeTimers({ toFake: [..., 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'] })` cleanly. 4 unit + 3 e2e tests, all green in isolation. Reviewer caught two real Important issues (setText-after-unmount, no `.scramble` CSS for affordance) — both surgical self-fix.
- **What broke:** Full-suite e2e went from 16-pass to 12-pass-3-fail under default 4-worker parallelism. Initial reaction was "what did self-fix break?" but stash + rerun proved the regression existed at `5cba61d` (implementer's commit) — Task 5's added bundle weight pushed shared preview-server load past a tipping point where the loader's 700ms in-flight window can't be observed before page loads finish under server stress. Fix: `workers: 2` in playwright.config.ts (kept cross-file parallel, halved server pressure). Full suite now passes in 26s (faster than the failing 4-worker run at 50s).
- **Process gap:** Implementer ticked spec TODO again despite explicit dispatch instruction NOT to. That's twice now. Adding to memory: future dispatches need a stronger "files you must not modify" header, possibly with the exact file path repeated.
- **Promoted to repo:** workers:2 with explanatory comment. The "implementer ticks spec against instruction" pattern goes to memory.
- **Cost:** 1 implementer (sonnet) + 1 reviewer + 1 self-fix + 1 unrelated debug = 3 dispatches' worth of work, but the parallelism bug would have surfaced eventually anyway.

## Task 6 — Section content viewport enters

- **What worked:** Strengthened "FILES YOU MUST NOT MODIFY" guardrail in the dispatch (with the spec file path repeated in a banner header) — implementer correctly left the spec file alone for the first time. The implementer also caught a real plan gap (`Contact.tsx` doesn't use `SectionHeading`, so the test selector wouldn't match) and added an additive `section-title` alias class without breaking existing styles.
- **What broke:** Code-reviewer agent hit a quota wall, forcing me to do the review inline. Found three real layout regressions the e2e tests didn't catch (because they only assert opacity, not bbox/layout):
  1. **Projects bento:** `motion.div` wrappers stripped `.bento-card--lg/--md` from being direct grid children → all cards collapsed to 1×1 (instead of the bento-pattern lg=2×2, md=2×1, sm=1×1).
  2. **Embeds .tbl:** Each `.tbl-row` became the only child of its `motion.div` wrapper, so `.tbl-row:last-child { border-bottom: none }` matched EVERY row and stripped all dividers.
  3. **Contact .contact-list:** Same `:last-child` issue with `.contact-row`.
- **Self-fix:** Promoted the inner element to BE the motion component instead of wrapping it. `motion.create(Link)` for Projects (react-router-dom Link), `motion.a` for Embeds and Contact rows. Variants now apply directly to the grid item / row.
- **Promoted to repo:** Lesson — "wrap each child in `motion.div variants={childVariants}`" is fine for plain divs but breaks any layout that relies on direct-descendant CSS (grid spans, `:last-child`, sibling combinators). Future plans involving stagger-children should specify "promote the existing root to motion.* rather than nesting" when the children's styling is structurally load-bearing.
- **Testing gap:** Section-enters tests only check opacity. They missed all three layout regressions. Adding visual regression coverage (bbox, dividers) would be a Task 9 candidate.
- **Cost:** 1 implementer (sonnet) + 0 reviewer (quota) + 1 inline self-review + 1 self-fix = effectively the same dispatch count, but I burned time on the inline review that an agent would have done in parallel.

## Task 7 — Title scroll-linked fade

- **What worked:** Implementer caught and fixed two real plan bugs without escalating: (1) the plan's opacity formula `1 - easeOut2(progress)` produced 0.12 at top=-50 (needed 0.4–0.7), corrected to `easeOut2(1 - progress)` which yields 0.578 — math now matches the spec; (2) the plan's `useScrollFade` would conflict with Task 6's `RevealOnView whileInView`: `scrollIntoViewIfNeeded` on tall sections placed titles at top=-287px, which `useScrollFade` would write as opacity=0 just as Framer's `whileInView` was animating opacity 0→1. Fix: `IntersectionObserver` gate so `useScrollFade` only writes opacity AFTER the element has entered the viewport. Spec semantics are still preserved (titles fade as they EXIT the top, not as they enter).
- **What to change:** The plan should have flagged the Framer/GSAP opacity-conflict risk explicitly. I anticipated it in the dispatch ("KNOWN INTERACTION RISKS"), but the plan itself didn't carry the warning, so a less attentive reader could have shipped a broken Task 6 + 7 stack. Future plans involving multiple opacity-writers on the same element need to call out the ordering contract.
- **Spec discipline:** Implementer correctly left the spec file untouched. Two-for-two on the new "FILES YOU MUST NOT MODIFY" guardrail.
- **Promoted to repo:** None — the formula fix is code-local, the IO-gate is documented in the hook's comment.
- **Cost:** 1 implementer (sonnet) + 0 reviewer (skipped — implementer's deviations were already principled and well-explained, inline-reviewed instead) + 0 self-fix = 1 dispatch. Cleanest task yet.

(Tasks 8–10 retros land here as they complete.)
