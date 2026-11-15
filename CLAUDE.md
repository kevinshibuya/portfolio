# Portfolio, Claude instructions

Kevin Shibuya's personal developer portfolio, live at kevinshibuya.com: a bilingual EN/PT React single-page site. Version 4 of the site landed on 2026-11-14. Routes: `/` (home), `/all-work` (every case study and the newsroom interactives), `/projects/:slug` (the ten case studies in `src/data/projects.ts`: eight newsroom and client projects, Consilia IA, the product Kevin co-founded, and one of his own public repositories); any other path renders the project template's not-found view.

Stack: React 19, TypeScript strict, Vite 6 with SWC, TailwindCSS v4 through the Vite plugin (configured in CSS `@theme`, no `tailwind.config.js`; the site is styled almost entirely by the plain classes in `src/index.css`), react-router-dom 7, Lenis smooth scroll, npm. No animation library and no 3D library: motion is CSS, the Web Animations API, view transitions and one shared animation-frame loop; the paint is raw WebGL. Translations are a small context in `src/i18n/index.tsx` over two JSON locale files. `framer-motion`, `gsap`, `three`, `@react-three/*`, `postprocessing`, `i18next` and `react-i18next` are still listed in `package.json`, but nothing in `src/` imports them.

How it works: `docs/architecture.md` and `GLOSSARY.md` describe the site before version 4 and are due a rewrite. Until then, the section comments in `src/index.css` and the doc comment at the top of each component are the reference; the summary below maps them.

## Branches and deploy (read before any merge)

**A push or merge to `main` auto-deploys to production at https://kevinshibuya.com.** The deploy is wired through Cloudflare Workers Builds, connected to this repository directly, **not** through a GitHub Actions workflow. There is no `.github/workflows` directory, and **its absence is not evidence that nothing ships.** "No CI, so merging is safe" is the exact reasoning that caused a production incident.

- **STANDING RULE (Kevin, 2026-09-03): `main` is FROZEN until the portfolio revamp is complete.** Until Kevin says the revamp is finished, nothing merges into `main`: not a feature, not a fix, not a "sync". `main` is not a decision to make in the meantime, no matter how green or how small the change.
- **Branch order (Kevin, 2026-10-07):** `main` is production. `staging` is the human test environment for production. `ai-staging` is the agents' playground before a human tests anything. Neither `staging` nor `ai-staging` deploys anything, and both are expected to run far ahead of `main`; a large `main..staging` count is the NORMAL state here, not drift to be tidied up.
- **Branch flow:** feature branch, then PR into **`ai-staging`**. Merging an approved, GREEN PR into `ai-staging` needs no permission; the merge hook leaves it open by design. Feature-branch commits, pushes and PR creation need no permission either.
- **Promoting `ai-staging` to `staging` is Kevin's call, after he validates `ai-staging`.** `staging` sits behind `~/.claude/bin/block-merge-to-main.sh` together with `main`. Merging into it needs Kevin's per-action say-so, and the one authorised command is prefixed `ALLOW_MAIN_MERGE=1`. That token is re-authorised per command, and a say-so for a `staging` merge never carries to `main`.
- **Promoting `staging` to `main` is a PRODUCTION RELEASE, not a branch sync.** It needs an explicit, per-action decision from Kevin *for that release*; blanket earlier permission to "merge" does not cover it.
- **`npm run deploy` (`npm run build && wrangler deploy`) ships production directly, without a merge, a push or a PR.** The merge hook inspects git and `gh pr merge` only, so it never sees this. It is Kevin's command; an agent does not run it, frozen `main` or not.
- If a merge's real scope differs from what was asked for (say "merge my feature" would actually promote 153 accumulated commits), **stop and confirm before acting.** Noting the discrepancy and proceeding anyway is the failure.

**Incident, 2026-09-02.** `staging` was merged to `main` (153 commits) on the stated but incorrect basis that nothing would deploy; Cloudflare built and shipped it, and production served the unreleased redesign for about 15 hours before Kevin caught it, not any check here. There is no monitoring on this, so after ANY change to `main`, verify production from the outside immediately with step 3 below instead of assuming the deploy matched intent.

**Recovery that worked, in order:**

1. `ALLOW_MAIN_MERGE=1 git push --force-with-lease=main:<current> origin <prior-sha>:main` puts `main` back on its exact prior tip.
2. Cloudflare rebuilds from that push automatically; it restored the previous site in about 40 s, but only once someone knew to trigger it. No manual deploy was needed, and none was possible: `wrangler` was logged out (`Not logged in ... environment is non-interactive`). **Do not assume `wrangler deploy` is available as a recovery path.** Check `npx wrangler whoami` first, and ask Kevin to run `! npx wrangler login` if it is needed.
3. Verify production from the outside, never from the repo. The live HTML is the only proof:
   `curl -s https://kevinshibuya.com/ | grep -oE 'theme-color" content="[^"]*"'`
   The pre-redesign site is `#F6F9FC`; the dark redesign is `#0B0E14`. `loader-ks` and `portfolio · 2026` appear only in the redesign. **Since the release of 2026-11-15, `#0B0E14` is the CORRECT production state**: production serves the site this file describes, and `#F6F9FC` would mean it has been rolled back.

**Release and rollback, 2026-11-13.** PR #48 merged `staging` into `main` on Kevin's go-ahead, and production served the redesign from 17:27 to 18:18 UTC. Kevin then judged it not ready to ship and had `main` put back on `62cd73c` with step 1 above; Cloudflare restored the old site in about 150 s. The freeze stands until Kevin says the revamp is finished.

**Release, 2026-11-15 (UTC).** PR #57 merged `staging` into `main` on Kevin's go-ahead of 2026-11-14, given for that release ("until this V4 final is merged into main and deployed into production"). Production has served version 4 since 02:21 UTC; `main` was at `62cd73c` before the merge, which is the tip to put back with step 1 above if he calls for a rollback. Kevin has not yet said whether the freeze on `main` ends with this release: until he does, the standing rule above holds for anything further.

**Second release, 2026-11-15 (UTC).** PR #61 merged `staging` into `main` on Kevin's go-ahead of the same day, given for that release ("until everything is properly merged into main and pushed to prod"): the mobile fixes, the content brought in step with the CV, and two new case studies (PR #59). Production has served it since 16:08 UTC, about 90 s after the merge; `main` was at `caf34d2` before it, which is the tip to put back with step 1 above if he calls for a rollback. The standing rule above still holds for anything further.

Nothing was lost in that incident because `staging` retained every commit. Keep it that way: **never roll back by deleting work from `staging` or `ai-staging`.**

## The site, version 4

**Design.** Two solid grounds, cream `#F9F4EC` and black, and the paint of the first screen. Orange `#D94300`, the paint's body colour, is the one accent: arrows, marks and the paint, never a surface and never text at rest. A dark section (`data-theme="dark"`) is the same tokens swapped. One family, Plus Jakarta Sans, roman only; six type sizes, each with one job (`mega`, `h1`, `h2`, `h4`, `p1`, `p2`); one 12-column grid; two curves, E1 for transitions and page-level moves, E2 for the pop of words and small parts. The frame, a hard black rectangle with the capture inset on a 4 % mat, is the shape the site is built from. The tokens and the reasoning are the TOKENS block at the top of `src/index.css`; the shader's colours are `src/utils/palette.ts`.

**Surfaces.**

| Surface | Files |
| --- | --- |
| Loader: an ink sheet with "ks." windows, painted by `index.html` at first byte; its exit (contraction, then a zoom through the cutout) and the entrance gate | `index.html`, `src/main.tsx`, `src/context/MotionContext.tsx` |
| Hero: the name and role line rising over the paint, which dissolves into the cream page below the first screen | `src/components/sections/Hero.tsx`, `src/hooks/useEntered.ts` |
| The paint: one fragment shader, at most one WebGL context drawing at a time (hero, closing, and an off-document source); paint windows copy it into 2D canvases cut to a shape; a static stand-in where WebGL is missing | `src/components/canvas/paint.ts`, `FluidWaves.tsx`, `PaintWindow.tsx` |
| About | `src/components/sections/About.tsx` |
| Selected work: three projects stacked, a frame each, the name and "view" beside the one in play, a line pinned to the bottom corners | `src/components/sections/SelectedWork.tsx` |
| Dark section: the other case studies as rows, every job as a row, the closing link to all work | `src/components/sections/MoreWork.tsx` |
| Contact and footer, on the paint | `src/components/layout/Closing.tsx` |
| Header and language pair | `src/components/layout/Header.tsx` |
| Page change: view transitions, and the arrival of a page's `data-enter` parts | `src/components/layout/PageChange.tsx` |
| History: each entry of the tab's history keeps its own scroll position, so Back and Forward land where a page was left; a page reached by a link opens at its top | `src/utils/scrollMemory.ts`, `src/hooks/useScrollMemory.ts` |
| All work | `src/pages/AllWork.tsx` |
| Project page, in two forms chosen by `useWide` at 861 px. Wide: one numbered column of every capture (`.p-column`), the recording travelling down to head it, a sticky credits column (`.p-credits`), the live link in the title row (`.p-live`), the diagram last. Narrow: the facts under the title (`.p-facts`), then labelled groups (`.p-group`) | `src/pages/ProjectDetail.tsx`, `src/hooks/useWide.ts`, `src/data/media.ts`, `src/data/galleries.ts`, `src/components/ui/Travel.tsx` |
| Shared parts: frame, work row, label, arrow, rolling link, the name that answers the pointer, the diagram | `src/components/ui/` |

**Motion.** The entrance holds a direct load for about two seconds: `MotionContext`'s `entranceDone` resolves when the loader hands over, and the hero's rise, the header, Lenis and the home sections below the first screen all wait on it. Scroll-following motion subscribes to the one loop in `src/utils/frame.ts`. Under `prefers-reduced-motion` the entrance is instant, the paint draws one still frame, and the REDUCED MOTION block in `src/index.css` puts everything where it ends.

**Hooks the tests read.** `body[data-loader-state="done"]` once the loader has gone; `section.hero[data-entrance="settled"]` once the rise has landed; on a paint canvas, `data-canvas` (`fluid-waves`, `fluid-waves-closing`), `data-paused`, `data-painted` and `data-static`. The paint's measurement hooks are URL params, dormant otherwise: `?perf-seed=`, `?perf-freeze=`, `?perf-counters` (`paint.ts`).

## Verification

- **Typecheck with `npx tsc -b`** (or `npm run build`, which runs `tsc -b && vite build`). A bare `npx tsc --noEmit` is a no-op in this repo: the root `tsconfig.json` is `"files": []` plus project references, so it exits 0 on code that does not compile. `tsc -b` covers `src/` and `vite.config.ts` only; the tests are transpiled by Vitest and Playwright without a typecheck.
- **Kill port 4173 before a direct `npx playwright test` run:** `lsof -ti:4173 | xargs -r kill -9` (bare `xargs kill -9` runs with no argument and exits non-zero when the port is free, breaking an `&&` chain). `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a stale preview server survives and the suite tests the previous build.
- **A runtime error inside a canvas is invisible to DOM assertions.** The canvas keeps its element and its attributes while the frame loop throws. Every browser spec fails on any console error or page error (`collectErrors` in `tests/e2e/helpers/site.ts`), and that is what catches it.
- **The suite runs Chromium only, and three behaviours exist only in WebKit** (Safari and every iOS browser): the loader's exit frame rate, the app starting on the loader's first frames (WebKit reports no paint-timing entry for the loader, `vite.config.ts`), and compositor animations restarting when a view transition ends (`holdClocks` in `PageChange.tsx`). A change to the loader or to the page change is checked on Playwright's WebKit with an iPhone profile (`npx playwright install webkit`): frame times across the exit, and a recorded page change read frame by frame. A DOM assertion cannot see the last one: the animation's clock in script runs straight through while the compositor replays it.
- **A rendered surface also needs a headless browser smoke:** it loads, the root renders, zero console errors. Typecheck and lint alone do not cover a surface.
- **Browser tests import `src/` modules that Node cannot load** (`src/data/media.ts` imports JSON, `src/data/archive.ts` a `?raw` CSV) through `loadSrc` in `tests/e2e/helpers/site.ts`, which runs them through Vite.
- **The set:** `npx tsc -b`, `npm run lint`, `npx vitest run`, then e2e in two suites (ADR 0013): `npm run test:e2e:quick` in a PR's fix loop, and `npm run test:e2e` (the full suite) once on the final head before the `ai-staging` merge. Both run through `scripts/e2e.sh`, which frees 4173, builds once and owns the server. A surface change adds the smoke.

## Standing rules

- **Bilingual from the first commit.** Every reader-facing string exists in both `en` and `pt`: UI strings in `src/i18n/locales/` (a unit test holds the two files to the same keys), content as `{ en, pt }` pairs. Two documented exceptions: embed titles are Portuguese only, because the source is editorial, and the loader's two corner labels in `index.html` are English only, because they paint before React and i18n load. Decision: ADR 0001.
- **Every animation honours `prefers-reduced-motion`.**
- **A palette or token change ships with a recomputed AA audit** across every affected text/background pair, verified, not hoped. The tables are in `docs/contrast.md`, recomputed as a unit.
- **A project's name is set as written** (Kevin, 2026-11-15): wherever a case study's title renders, the element carries `.as-written`, which lifts the display type's lowercase. `WorkRow` takes it as the `asWritten` prop. Everything else in the display sizes stays lowercase.
- **`·` in reader-facing prose,** never a spaced em-dash. Reader-facing means site copy and i18n strings; date ranges, code comments and quoted wordmarks are exempt.
- **TypeScript:** strict, no `any`, explicit return types on hooks and utilities.
- **Components:** functional, with the props interface above the component.
- **Performance:** `will-change` only while an element animates; lazy-load canvas sections behind `Suspense` with a fallback.
- **Tailwind:** semantic class groupings, and repeated patterns become components.

### Spec and plan checkbox discipline

Checkboxes in `docs/superpowers/specs/` and `docs/superpowers/plans/` are the source of truth for progress, and a stale box silently breaks the next session that resumes the work.

- **Plan step boxes:** the implementer edits `- [ ]` to `- [x]` immediately after that step's command lands, before starting the next step. Never batch the ticks at the end.
- **Spec TODO boxes:** the controller ticks one only when its acceptance test passes and review approves.
- **Before announcing a task complete,** grep its section for a remaining `- [ ]` and either tick it or say why it does not apply.
- **When dispatching an implementer,** put the per-step ticking instruction in the dispatch prompt; a subagent does not infer it.
- **Only edit boxes that already exist.** If the work fits none of them, revise the plan or spec first, then proceed.

## NO

- **Cards or bento.** Open typographic rows and frames. Rounded-full pills, chips and buttons survive where already used, on filters and tags.
- **Router access anywhere in `src/components/canvas/`.** `FluidWaves.tsx` reads `.hero-zone` layout on purpose, so the dissolve band is never a hardcoded svh ratio.

## Where things live

| What | Where |
| --- | --- |
| Rules an agent obeys every turn | `CLAUDE.md` |
| The design system, section by section | the block comments in `src/index.css` |
| How each surface worked before version 4 (due a rewrite) | `docs/architecture.md` |
| AA contrast tables | `docs/contrast.md` |
| Glossary and invariants, before version 4 (due a rewrite) | `GLOSSARY.md` |
| Decisions with their reasoning | `docs/adr/` |
| Records of live systems | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
| Records of retired systems | `docs/superpowers/archive/` |
| Pending work that has no spec yet | GitHub issues on the repository |
| The resume note (ignored, never tracked) | `HANDOFF.md` |
| Tests | `tests/e2e/`, `tests/unit/` |
| Content types | `src/types/content.ts` |
| The studio shoot: the scripts that film a project's captures and recordings, and the pass that builds `public/media/<slug>/` from them (outside this repository) | `~/hillclimbs/portfolio/tools/studio/` (`kit.mjs`, one script per project), `~/hillclimbs/portfolio/bench/` (`v3-media.mjs`, `consilia-media.mjs`) |
| Content data | `src/data/`: `projects.ts`, `embeds.csv`, `media.json` (captures and recordings, served from `public/media/<slug>/`), `galleries.ts`, `architecture.ts`, `workExperience.ts`, `social.ts` |
| UI strings, both languages | `src/i18n/locales/` |
| Stack, getting started, tree | `README.md` |
