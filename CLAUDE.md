# Portfolio, Claude instructions

Kevin Shibuya's personal developer portfolio, live at kevinshibuya.com: a bilingual EN/PT React single-page site with per-project detail routes, whose centerpiece is a pinned 3D Selected Work scene between two raw-WebGL shader canvases.

Stack: React 19, TypeScript strict, Vite 6 with SWC, TailwindCSS v4 through the Vite plugin (configured in CSS `@theme`, no `tailwind.config.js`), Framer Motion v12, GSAP with ScrollTrigger, React Three Fiber with `@react-three/postprocessing` for the Selected Work scene only, react-i18next, npm.

How it works: `docs/architecture.md`.

## Branches and deploy (read before any merge)

**A push or merge to `main` auto-deploys to production at https://kevinshibuya.com.** The deploy is wired through Cloudflare Workers Builds, connected to this repository directly, **not** through a GitHub Actions workflow. There is no `.github/workflows` directory, and **its absence is not evidence that nothing ships.** "No CI, so merging is safe" is the exact reasoning that caused a production incident.

- **STANDING RULE (Kevin, 2026-09-03): `main` is FROZEN until the portfolio revamp is complete.** Until Kevin says the revamp is finished, nothing merges into `main`: not a feature, not a fix, not a "sync". `main` is not a decision to make in the meantime, no matter how green or how small the change.
- **Branch flow:** feature branch, then PR into **`staging`**. `staging` is the integration branch and deploys nothing. It is expected to run far ahead of `main`; a large `main..staging` count is the NORMAL state here, not drift to be tidied up.
- **`staging` sits behind `~/.claude/bin/block-merge-to-main.sh` together with `main`.** Merging a PR into it needs Kevin's per-action say-so, and the one authorised command is prefixed `ALLOW_MAIN_MERGE=1`. Feature-branch commits, pushes and PR creation need no permission.
- **Promoting `staging` to `main` is a PRODUCTION RELEASE, not a branch sync.** It needs an explicit, per-action decision from Kevin *for that release*; blanket earlier permission to "merge" does not cover it.
- If a merge's real scope differs from what was asked for (say "merge my feature" would actually promote 153 accumulated commits), **stop and confirm before acting.** Noting the discrepancy and proceeding anyway is the failure.

**Incident, 2026-09-02.** `staging` was merged to `main` (153 commits) on the stated but incorrect basis that nothing would deploy; Cloudflare built and shipped it, and production served the unreleased redesign for about 15 hours before Kevin caught it, not any check here. There is no monitoring on this, so after ANY change to `main`, verify production from the outside immediately with step 3 below instead of assuming the deploy matched intent.

**Recovery that worked, in order:**

1. `ALLOW_MAIN_MERGE=1 git push --force-with-lease=main:<current> origin <prior-sha>:main` puts `main` back on its exact prior tip.
2. Cloudflare rebuilds from that push automatically and restored the previous site in about 40 s, but only once someone knew to trigger it. No manual deploy was needed, and none was possible: `wrangler` was logged out (`Not logged in ... environment is non-interactive`). **Do not assume `wrangler deploy` is available as a recovery path.** Check `npx wrangler whoami` first, and ask Kevin to run `! npx wrangler login` if it is needed.
3. Verify production from the outside, never from the repo. The live HTML is the only proof:
   `curl -s https://kevinshibuya.com/ | grep -oE 'theme-color" content="[^"]*"'`
   The pre-redesign site is `#F6F9FC`; the dark redesign is `#0B0E14`. `loader-ks` and `portfolio · 2026` appear only in the redesign.

Nothing was lost in that incident because `staging` retained every commit. Keep it that way: **never roll back by deleting work from `staging`.**

## Verification

- **Typecheck with `npx tsc -b`** (or `npm run build`, which runs `tsc -b && vite build`). A bare `npx tsc --noEmit` is a no-op in this repo: the root `tsconfig.json` is `"files": []` plus project references, so it exits 0 on code that does not compile.
- **Kill port 4173 before an e2e run:** `lsof -ti:4173 | xargs kill -9`. `playwright.config.ts` sets `reuseExistingServer: !process.env.CI`, so a stale preview server survives and the suite tests the previous build.
- **A runtime error inside a canvas is invisible to DOM assertions.** The canvas keeps its element and its attributes while the frame loop throws. `tests/e2e/scene-scrub.spec.ts` is the only guard that catches it.
- **A rendered surface also needs a headless browser smoke:** it loads, the root renders, zero console errors. Typecheck and lint alone do not cover a surface.

## Standing rules

- **Bilingual from the first commit.** Every reader-facing string exists in both `en` and `pt` as a `{ en, pt }` pair. Two documented exceptions: embed titles are Portuguese only, because the source is editorial, and the loader's two corner labels in `index.html` are English only, because they paint before React and i18n load. Decision: ADR 0001.
- **Every animation honours `prefers-reduced-motion`.**
- **One library per animation** (`docs/architecture.md#animation-lanes`). GSAP is one-shot entrance orchestration only. Framer Motion owns state-driven and scroll-scrubbed motion. The R3F frame loop reads Framer MotionValues and writes three objects itself. Never two lanes on one animation.
- **A palette or token change ships with a recomputed AA audit** across every affected text/background pair, verified, not hoped. The tables are in `docs/contrast.md`, recomputed as a unit.
- **`·` in reader-facing prose,** never a spaced em-dash.
- **TypeScript:** strict, no `any`, explicit return types on hooks and utilities.
- **Components:** functional, with the props interface above the component.
- **GSAP:** scope with `gsap.context()` and a ref, and return cleanup from `useEffect`.
- **Performance:** `will-change` only while an element animates; lazy-load canvas sections.
- **Tailwind:** semantic class groupings, and repeated patterns become components.

### Spec and plan checkbox discipline

Checkboxes in `docs/superpowers/specs/` and `docs/superpowers/plans/` are the source of truth for progress, and a stale box silently breaks the next session that resumes the work.

- **Plan step boxes:** the implementer edits `- [ ]` to `- [x]` immediately after that step's command lands, before starting the next step. Never batch the ticks at the end.
- **Spec TODO boxes:** the controller ticks one only when its acceptance test passes and review approves.
- **Before announcing a task complete,** grep its section for a remaining `- [ ]` and either tick it or say why it does not apply.
- **When dispatching an implementer,** put the per-step ticking instruction in the dispatch prompt; a subagent does not infer it.
- **Only edit boxes that already exist.** If the work fits none of them, revise the plan or spec first, then proceed.

## NO

- **A light theme outside the sanctioned chapter.** The hero, Contact and Footer stay ink; the only light nav is `.nav--on-light`.
- **Cards or bento.** Open typographic rows, except the scene's framed cards.
- **A scrim, halo or shader darkening under the hero text.** It reads as an accessibility fix and is a ratified exemption. Decision: ADR 0004.
- **A fourth canvas** anywhere on the page.
- **`@react-three/drei`.** Not installed; blob shadows and R3F's default camera replace it.
- **Anton anywhere but the Selected Work title.** Jakarta is the site voice.
- **A halo or glow around a card.**
- **A DOM element that tracks the settled card.** The card carries its own caption. Decision: ADR 0011.
- **Router access, or DOM access beyond the canvas element itself, inside `src/components/canvas/`.**
- **A section eyebrow or number anywhere.**
- **A CSS entry veil on the hero.** The shader's cream dissolve owns that ramp.
- **The exit veil inside `#chapter-light`.** It is a sibling; nested, its `var(--bg)` resolves to cream and the fade disappears.
- **A legacy alias (`--cream`, `--ink`, and the rest) read inside `#chapter-light`.** The scope re-declares canonical tokens only, so an alias renders cream on cream.
- **`overflow` or `position` on `#chapter-light`.** Either one silently breaks the scene's sticky pin.
- **A spaced em-dash in reader-facing prose.**

## Where things live

| What | Where |
| --- | --- |
| Rules an agent obeys every turn | `CLAUDE.md` |
| How each surface works | `docs/architecture.md` |
| AA contrast tables | `docs/contrast.md` |
| Glossary and invariants | `CONTEXT.md` |
| Decisions with their reasoning | `docs/adr/` |
| Records of live systems | `docs/superpowers/specs/`, `docs/superpowers/plans/` |
| Records of retired systems | `docs/superpowers/archive/` |
| The resume note (ignored, never tracked) | `HANDOFF.md` |
| Tests | `tests/e2e/`, `tests/unit/` |
| Content types | `src/types/content.ts` |
| Content data | `src/data/`, including `src/data/embeds.csv` |
| Stack, getting started, tree | `README.md` |
