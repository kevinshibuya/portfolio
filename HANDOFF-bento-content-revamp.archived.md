# HANDOFF — portfolio

> Fresh-context handoff. **This session:** normalized the portfolio's personal info to the freshly-rebuilt CV, adopted the CV's 6-group skills taxonomy, and stripped spaced em-dashes from all reader-facing prose. Committed, fast-forward merged to `main`, and **pushed to `origin/main` → deployed to `kevinshibuya.com`**. The prior bento entrance fix shipped in the same push. The 3D About cinematic remains the live WIP on a separate branch (appendix). Read **Repo state** first.

## Repo state (verified this session, single marked command)

| branch | tip | status |
| --- | --- | --- |
| `main` (local) | `3f73927` | CV/portfolio normalization + bento fix. **In sync with `origin/main` (0 ahead, 0 behind). PUSHED + DEPLOYED.** |
| `origin/main` | `3f73927` | live/public; deployed to `kevinshibuya.com`. A push here auto-deploys (Cloudflare Workers). |
| `feat/about-cinematic-rework` | `b3ebd46` | **WIP — 3D About cinematic.** Committed & clean. The next resume target (appendix). |
| `feat/lighthouse-95` | `44d163f` | perf WIP, untouched. |

Working tree on `main`: clean. `HANDOFF.md` + `tmp/` are gitignored on `main`, so they don't show as untracked. Remote has only `origin/main` (stale `cloudflare/workers-autoconfig` pruned this session — already gone on GitHub).

⚠️ **Stash:** `stash@{0}: On main: WIP cv pdfs` — pre-existing, untouched (untouched across several sessions now). Leave it unless the user asks.

⚠️ **zsh footguns (CLAUDE.md):** `set -e` does NOT halt on `git checkout` abort; always assert `[ "$(git branch --show-current)" = main ]` after checkout and verify HEAD moved after merge. `for` loops in chained Bash can drop PATH — wrap in `/bin/bash -c`.

⚠️ **Push to main is classifier-gated:** the first `git push origin main` gets DENIED by the harness auto-mode classifier even after the user authorized it via AskUserQuestion. It went through after the user said "you can push it for me." Expect this; surface the denial and get a direct "push it" or a permission rule. (Memory: `feedback_push_main_gated`.)

---

## This session's goal (DONE — committed `3f73927`, pushed + deployed)

Propagate the rebuilt CV (`~/keki/cv-rebuild`) into the portfolio, normalize all personal facts to it as the source of truth, adopt the CV's new 6-group skills taxonomy, and strip spaced em-dashes (` — `) from all reader-facing prose. Then branch cleanups + push to prod.

Spec (all boxes ticked, tracked): `docs/superpowers/specs/2026-06-15-cv-portfolio-normalization-design.md`.

## What shipped

1. **CVs swapped** — `public/cv-en.pdf` / `cv-pt.pdf` ← `cv-en-updated.pdf` / `cv-pt-updated.pdf`. These are the resume-download targets (`Hero.tsx`, `Contact.tsx` use `/cv-{lang}.pdf`). Verified page 1 shows the new title/summary.
2. **Skills → CV's 6 groups** (`src/data/skills.ts` + `Skills.tsx` `categoryKeys` + i18n `sections.skills.*`): frontend · design · backend & cloud · devops & testing · **ai engineering** · leadership. `Skills.tsx` is data-driven; `.skills-grid` is `repeat(3,1fr)` → auto-flows 3×2 desktop, 2-col tablet, 1-col mobile. Screenshot-confirmed.
3. **Work-experience facts** (`src/data/workExperience.ts`): RBS poll bullet drops the inaccurate "Next.js" claim and names "Enquetes GZH" (Firebase-backed); Flow Autobody role → "Frontend Developer" (was "& Tech Lead"); Idéia 2001 → "São Caetano do Sul, BR" + accent. **Next.js stays in RBS's tech list** — Painel da Reconstrução genuinely is Next.js 14.
4. **Em-dash sweep (whole portfolio)** — replaced spaced ` — ` in `projects.ts`, `workExperience.ts`, `i18n/locales/{en,pt}.json`, `index.html` (meta/og/twitter/JSON-LD + title separators), and `ProjectDetail.tsx` document title. Conventions: separators → middle dot `·`; in-sentence → colon / comma / parens. **Kept:** date ranges, code/HTML comments (not reader-facing), the empty-value `'—'` UI placeholder (ArchiveDropdown/Archive), and the literal `'ZEROHORA — fotos do ano 2024'` wordmark quote.
5. **Branch cleanups** — deleted merged `feat/projects-bento-revert`; pruned stale `cloudflare/workers-autoconfig` remote ref.

## Verification (all run this session)

- `npx tsc -b` ✅ clean · `vitest run` ✅ 73/73 · `npm run build` ✅ (HeroAccent3D chunk-size warning is pre-existing/expected)
- Grep confirms only intentional em-dashes remain (date ranges, comments, `—` placeholder, ZEROHORA wordmark).
- Playwright screenshots (`tmp/`, served via `npx vite preview` :4173): Skills 6-group 3×2 desktop + single-column mobile both correct; Stats receipt shows colon-before-inline-link and no trailing eyebrow dash.

## What worked

- **CV HTML as structured source of truth** — read `cv.html`/`cv-pt.html` for exact group titles + items rather than OCR'ing the PDFs.
- **Audit-first** — grepped every personal-info surface (`src/data/*`, i18n, `index.html`, components) to build a discrepancy list before editing; found the Skills section had no AI category at all despite the CV's AI-engineer repositioning.
- **Targeted per-string Edits, never `replace_all` on `—`** — date ranges and code comments share the glyph; a blind replace would have corrupted them. `replace_all` used only on genuinely-unique repeated strings (title separators, shared og/twitter description).
- **Screenshot verification** of the one structural UI change (Skills 3→6 groups) before declaring done.

## What didn't work / gotchas

- **First `git push origin main` was denied** by the auto-mode classifier despite the user's AskUserQuestion "push to prod" choice — needed a fresh direct "push it for me." Don't treat the denial as the user changing their mind. (See the ⚠️ above.)
- **`git push origin --delete cloudflare/workers-autoconfig` errored** ("remote ref does not exist") — the branch was already auto-deleted on GitHub at PR#1 merge; only the local tracking ref was stale. Fixed with `git remote prune origin`.

## Next steps

1. **Post-deploy check:** confirm the live resume-download buttons serve the NEW PDFs once the deploy finishes (CDN/edge may cache the old `cv-{en,pt}.pdf` briefly).
2. **(Flagged, user's call)** the `'ZEROHORA — fotos do ano 2024'` wordmark quote in `projects.ts` still contains an em-dash — kept as a faithful quote of the on-screen wordmark. Change it too if the user wants literally zero em-dashes.
3. **Future-proofing (durable):** when editing portfolio copy, do NOT reintroduce spaced ` — ` in reader-facing prose; the CV at `~/keki/cv-rebuild` is canonical for personal facts. (Memory: `project_cv_source_emdash_ban`.)
4. **The live ongoing work = the 3D About (appendix below).**

---

## Appendix — WIP: 3D About cinematic (`feat/about-cinematic-rework` @ `b3ebd46`)

The live WIP. The new 3D About will eventually replace the "how i work" About section that was removed from `main` earlier (DOM About is gone; reintroduced when this ships).

**Goal:** polish the About-section storm cinematic; then code-review → finish the branch.

**Landed & COMMITTED** (visually verified via Playwright sweep):
1. Transparent canvas bg — removed the mist-blue backplane in `Scene.tsx` (canvas already `gl={{ alpha: true }}`).
2. Robot dead-center / front-facing at p=0 — `ToyModel.tsx` `MODEL_FRONT_OFFSET_Y` retuned `Math.PI → -Math.PI/4` (empirical).
3. Robot stays centered during explosion — two-pass setup `useEffect`: compute centroid of rest positions, then `scatterTarget = (rest - centroid) * EXPLOSION_FACTOR` (`= 3.8`); radial offsets sum ~0 so centroid stays anchored.

**Attempted then reverted — do NOT re-add:** per-fragment text animation (scale-in + Y bob + Z tilt) in `StormText.tsx`. User: "remove this new wobbly animation." Keep text editorial/still; only the cylinder Y rotation drives motion. **Brainstorm before touching text animation again.**

**Verification at last 3D checkpoint:** `tsc -b` clean, `vitest run` green, `npm run build` ok.

**Next steps for the 3D work:**
1. Ask the user what (if any) text animation they actually want before implementing.
2. Robot spin timeline: edit `useAboutProgress.ts:40` `robotSpinY = useTransform(scrollYProgress, [...], [...])` (cumulative radians; arrays equal length) once the user gives values.
3. When ready to ship to `main`, it reintroduces an About section. If it adds entrance animations, beware the **re-render-kills-stagger trap**: setState above an in-flight `whileInView`/`viewport.once` stagger freezes children at opacity 0 — route pointer/hover state through MotionValues + leaf components (memory: `reference_rerender_kills_staggered_entrance`; the bento fix in `Projects.tsx` is the reference implementation).
4. Commit only when asked; then code-review (**Opus** subagent — `fable` is BANNED per CLAUDE.md 2026-06-13; reviews always use the best available model) → `finishing-a-development-branch`.

**Open spec TODOs (deferred):** R3F chunk network-filter test, About orchestrator branching unit test, E2E sparse-reveal opacity test.

**Key files:** `Scene.tsx`, `ToyModel.tsx` (GLB + centroid scatter), `StormText.tsx` (6 drei `<Text>` in a rotating group — no per-fragment anim), `useAboutProgress.ts:40` (spin keyframes), `storm-math.ts` (pure math — don't touch), `scripts/storm-sweep.mjs` (sweep to `tmp/`).

**Reminders:** always Playwright-sweep visually after Scene/ToyModel/StormText changes; Lighthouse against `npx vite preview` (4173) not dev (`npm run preview` = `wrangler dev`); don't commit until asked.
