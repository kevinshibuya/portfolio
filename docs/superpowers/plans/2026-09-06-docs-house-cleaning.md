# Documentation house-cleaning implementation plan

**Goal:** Every agent-facing record in this repo has one home, describes the tree at HEAD, and is loaded only by the sessions that need it.
**Architecture:** `CLAUDE.md` shrinks to rules; the how-it-works prose moves to `docs/architecture.md`, the AA tables to `docs/contrast.md`; `CONTEXT.md` becomes a pure glossary; retired records move to `docs/superpowers/archive/`; session handoffs leave the index; ADR citations lose their line numbers. Each task rewrites one file from the facts the previous task settled, so the order is load-bearing.
**Spec:** `docs/superpowers/specs/2026-09-06-docs-house-cleaning-design.md`
**Execution model:** opus. Every task carries its source block, its acceptance commands and its boundaries, so the judgement is in the plan, not the executor. The PR review wave checks the rewritten docs against the code.
**Plan review:** one wave done 2026-09-06 (reviewer on opus, reviewer on fable, codex-review on sol); 9 blockers and 20 smaller findings consolidated into this version. No second wave.

## Global constraints

- **Base is `origin/staging` (`4d2d3f0`), never local `staging`.** Local `staging` is 33 commits stale, has no `CONTEXT.md`, and its `CLAUDE.md` predates the scene. Every `git show` in this plan reads `origin/staging:<file>`. Do not repair local `staging` with `git branch -f` (the hook denies it); `git fetch origin staging:staging` is allowed and optional.
- No source code changes. `src/`, `tests/`, `public/`, config files and `package.json` are untouchable.
- `~/.claude/bin/block-merge-to-main.sh` is never edited.
- Nothing under `perf/` or `tmp/` is deleted, except the scratch directory this plan creates. Untracked files stay on disk unless the task names them.
- Scratch directory: `tmp/house-cleaning/` (ignored through the existing `tmp/` rule). Created in Task 1; holds `claude-staging.md` and `dropped-facts.md`.
- Moves are `git mv`, so history follows the file. One commit per task, on branch `docs/house-cleaning` off `origin/staging`. Each task's commit includes that task's plan checkbox ticks (the plan is tracked from Task 1).
- Commit trailers per the session: `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` and the `Claude-Session:` line.
- Spaced em-dashes (`: `) do not appear in any prose written or kept by this plan. "Verbatim" in a task means the facts and their order; a spaced em-dash in a kept sentence becomes `·` or a full stop.
- `writing-for-agents` governs the voice of `CLAUDE.md`, `docs/architecture.md` and `CONTEXT.md`: written to be obeyed or looked up, not read end to end.
- **Path check**, run on every rewritten doc: `for f in $(grep -oE '`[A-Za-z0-9_./~-]+\.(ts|tsx|md|css|html|json|mts|mjs|sh|csv)`' <doc> | tr -d '`' | grep '/' | sort -u); do [ -e "${f/#\~/$HOME}" ] || echo "MISSING $f"; done` prints nothing. Bare filenames without a slash are allowed.
- **Citation check**, run on `CONTEXT.md` and every ADR: `grep -nE '`[^` ]*\.(ts|tsx|md|css|html|json|mts|mjs):[0-9]|`:[0-9]+' <file>` prints nothing. It matches `file.ext:12` and the continuation form `` `:11-14` ``, not CSS like `` `min-height:130svh` ``.
- **Anchor check**, run on every doc that links `docs/architecture.md#…`: `for a in $(grep -oE 'architecture\.md#[a-z-]+' <doc> | cut -d# -f2 | sort -u); do grep -qi "^## ${a//-/ }$" docs/architecture.md || echo "NO ANCHOR $a"; done` prints nothing.

### Task 1: Branch, track the plan, ignore rules, untracking

**Files:**
- `docs/superpowers/plans/2026-09-06-docs-house-cleaning.md`, `docs/superpowers/specs/2026-09-06-docs-house-cleaning-design.md`: add (currently untracked).
- `.gitignore`: modify: the `HANDOFF.md` line becomes `HANDOFF*.md`; its comment line becomes `# AI session scratch. Durable AI docs (CLAUDE.md, docs/) stay tracked; HANDOFF archives are kept locally, ignored.` (the current comment carries a spaced em-dash); add `perf/reports/` with the comment `# perf harness output (the harness lives on perf/hero-harness)` after the Playwright block. Nothing else changes.
- `.git/info/exclude`: modify: delete the two lines `/.claude/RESUME.md` and `HANDOFF*.md`. The `**/.claude/*` lines are harness-owned and stay.
- `.claude/RESUME.md`: delete (an August near-limit checkpoint, stale).
- The five tracked `HANDOFF-*.archived.md`: `git rm --cached` only, files stay on disk. Eight exist on disk (the eighth was archived by the planning session itself); three are already untracked, so the glob cannot be passed to git.
- `tmp/house-cleaning/`: create (empty for now).

**Acceptance check:** Before Step 3: `git check-ignore -v --no-index HANDOFF-press-revamp-plan2.archived.md` prints `.git/info/exclude:…:HANDOFF*.md` (plain `check-ignore` skips tracked files and prints nothing). After Step 5: `git check-ignore -v HANDOFF-press-revamp-plan2.archived.md perf/reports/x.json` prints two `.gitignore:` lines; `git status --short` shows exactly five `D ` lines and nothing else; `ls HANDOFF-*.archived.md | wc -l` is 8; `test ! -e .claude/RESUME.md`; `grep -c ' — ' .gitignore` is 0.

**Boundaries:** Do not touch `perf/reports` contents, `prompt.md`, `.superpowers/`. Do not add `perf/` as a whole to the ignore file: the harness branch tracks `perf/*.mjs` and `perf/baseline.json`.

- [x] **Step 1:** `git fetch origin && git checkout -b docs/house-cleaning origin/staging`; `git branch --show-current` prints `docs/house-cleaning`; `git diff --stat HEAD origin/staging` is empty.
- [x] **Step 2:** `git add` the plan and the spec; commit `docs: house-cleaning spec and plan`. `mkdir -p tmp/house-cleaning`.
- [x] **Step 3:** Run the "before" probe. Edit `.gitignore` (three lines). `git check-ignore -v perf/reports/x.json` resolves to `.gitignore`.
- [x] **Step 4:** Remove the two lines from `.git/info/exclude`; `rm .claude/RESUME.md`.
- [x] **Step 5:** `git rm --cached $(git ls-files 'HANDOFF-*.archived.md')`; run the "after" acceptance check.
- [x] **Step 6:** Tick this task's boxes; commit `chore(docs): untrack session handoffs, ignore perf reports`.

### Task 2: Archive the retired records

**Files:**
- `docs/superpowers/archive/README.md`: create: three sentences. What is here (records of systems the WebGL pivot or the Selected Work scene retired), that nothing here describes the tree at HEAD, and where current truth lives (`CLAUDE.md`, `docs/architecture.md`, `docs/adr/`).
- `docs/superpowers/archive/specs/`: 18 files by `git mv`: every `docs/superpowers/specs/2026-0[456]-*.md` (17) plus `2026-07-22-selected-work-card-stack-design.md`.
- `docs/superpowers/archive/plans/`: 17 files by `git mv`: every `docs/superpowers/plans/2026-0[456]-*.md` (15) plus `2026-07-22-selected-work-card-stack.md` and `2026-07-22-light-chapter-plan-a.md`.
- `docs/superpowers/archive/retros/page-animations.md`: `git mv` from `docs/superpowers/retros/page-animations.md`; the empty `retros/` directory disappears with it.
- `docs/adr/0005-scroll-is-the-playhead-with-no-per-frame-state.md` (lines 5 and 18) and `docs/superpowers/specs/2026-09-03-selected-work-scene-design.md` (line 8): modify: they link the card-stack spec; repoint to `docs/superpowers/archive/specs/…`. Any other live doc the Step 3 grep finds is repointed the same way and named in the commit message. `CLAUDE.md` and `CONTEXT.md` are NOT edited here.

**Work:** Move, then grep for every moved basename across live docs and repoint. Do not edit the content of any moved file. The link check excludes this plan, which names moved paths on purpose.

**Acceptance check:** `git status --short` shows only `R `, `A ` and `M ` lines. `ls docs/superpowers/specs | wc -l` is 9 (eight live plus the house-cleaning spec); `ls docs/superpowers/plans | wc -l` is 8 (seven live plus this plan); `ls docs/superpowers/archive/specs | wc -l` is 18; `ls docs/superpowers/archive/plans | wc -l` is 17. Link check: `for b in $(find docs/superpowers/archive -name '*.md' -exec basename {} \;); do grep -rl --exclude=2026-09-06-docs-house-cleaning.md "superpowers/\(specs\|plans\|retros\)/$b" docs/adr docs/superpowers/specs docs/superpowers/plans; done` prints nothing.

**Boundaries:** The live set is fixed by the spec: webgl-pivot, feedback-wave, motion-consistency, loader-ks-explosion, selected-work-light-chapter-design (spec) and light-chapter-plan-b (plan), both scene specs and plans, the morph contract, and the two house-cleaning docs. Anything else in doubt: stop and report `blocked: <file>`.

- [x] **Step 1:** `mkdir -p docs/superpowers/archive/{specs,plans,retros}`; write the README.
- [x] **Step 2:** `git mv` the 18 specs, 17 plans and the retro. Run the four `ls | wc -l` counts.
- [x] **Step 3:** Run the link check; repoint each hit; rerun until it prints nothing.
- [x] **Step 4:** Tick; commit `chore(docs): archive the records of retired systems`.

### Task 3: `docs/contrast.md`

**Files:**
- `docs/contrast.md`: create.

**Interfaces:**
- Produces: the file `CLAUDE.md`'s standing rule (Task 5) and `docs/architecture.md` (Task 4) point at for every AA pair.

**Work:** A short heading, one line naming the token file (`src/index.css`), and the standing rule from `CLAUDE.md` ("any palette/token change ships with a recomputed AA contrast audit across every affected text/background pair, verified, not hoped"). Then two sections, each with its table moved VERBATIM from `git show origin/staging:CLAUDE.md`: "Contact/Footer stage over the dimmed backdrop" (the worst-case derivation sentence, the 9-row table, the two notes on `.contact-num` and `.contact-meta`) and "Light chapter, Plan B" (the grounds sentence, the 16-row table; rows 3 and 3b are separate rows). Keep `docs/superpowers/plans/2026-09-02-light-chapter-plan-b.md` as the derivation source.

**Acceptance check:** `grep -c '^ *|' docs/contrast.md` equals `git show origin/staging:CLAUDE.md | grep -c '^ *|'`, which is 29 (2 header, 2 separator, 9 and 16 body rows). Path check prints nothing. `grep -c ' — ' docs/contrast.md` is 0.

**Boundaries:** No recomputation of any ratio. No edits to `CLAUDE.md` yet.

- [x] **Step 1:** Write the file from the two blocks; run the row-count check.
- [x] **Step 2:** Tick; commit `docs: the AA contrast tables get their own file`.

### Task 4: `docs/architecture.md`

**Files:**
- `docs/architecture.md`: create.
- `tmp/house-cleaning/claude-staging.md`: create: `git show origin/staging:CLAUDE.md`, the read-only source.
- `tmp/house-cleaning/dropped-facts.md`: create: one line per fact from the source that no new doc carries, with the reason (history; duplicated by ADR n; describes deleted code; stale aspiration). Not committed; pasted into the PR description in Task 9.

**Interfaces:**
- Consumes: `docs/contrast.md` (Task 3) as the only place ratios live.
- Produces: thirteen `##` headings, verbatim, whose slugs Tasks 5, 6 and 7 link to: `Palette and tokens`, `Typography`, `Canvases`, `Loader and entrance`, `Hero`, `Nav`, `Light chapter`, `Selected Work scene`, `WorkRow`, `Contact and Footer stage`, `Animation lanes`, `Layout and section flow`, `Content model`. Slug = lowercase, spaces to hyphens (`#selected-work-scene`, `#contact-and-footer-stage`).

**Work:** Source blocks in `claude-staging.md`: `## Design Direction` up to the line before `## Animation Library Usage Rules` (lines 37 to 119); `## Animation Library Usage Rules` (120 to 126); `## Content Types` (182 to 221); the `## Tech Stack` bullets (27 to 35) for the Canvases and Animation lanes sections. NOT a source: `## Architecture` (163 to 181) is a pre-revamp aspirational tree naming components that never existed (`HeroBackground`, `ParticleField`, `useSmoothScroll`); the real tree lives in `README.md` and Task 7 verifies it. NOT a source: `## Existing MVP Notes`; every line goes to `dropped-facts.md` as "done work or deleted code".

Rewrite under the thirteen headings; inside `Selected Work scene` use `###` sub-headings: anatomy, corridor and playhead, frame loop, title, card size, environment, breath, caption, pointer, fallback and data attributes. `Content model` holds Project, Embed, Archive item and highlightOrder as they are used on the page (the CSV columns, that `FORMATO` is always PROGRAMAÇÃO and ignored, that `imagePreview` is optional and a styled placeholder with a type badge stands in, the filter by `type` and `editorial`) and points at `src/types/content.ts` and `src/data/embeds.csv` for the shapes; it repeats no TypeScript.

Rules:
- Every current fact survives: token hexes, class names, data attributes, constants and their values (`CARD_MAX_PX` 620, `CARD_MIN_PX` 287, `titleCapPx` floor 56 and 72 in portrait, `SEAM_WIDTH_EM` 1.2, `SEAM_SIGMA_EM` 0.1, DPR cap 1.5, backdrop `opacity: 0.22`, the 130svh hero, the 550svh scroll, `playheadFor(p) = p·4.5 − 1.5`, the nav observer's `rootMargin: -8% 0px -91% 0px`, and every other number in the source). When in doubt, keep.
- History clauses go: "retired by the webgl-pivot plan", "the old `.hero-scrim`", "round two, 2026-09-05", "(dropped pre-plan)", "the interim ink aurora", names of deleted components. Each goes to `dropped-facts.md` with its reason. Where an ADR records the history, the section ends with `Decision: ADR 000n`.
- Ratios and AA tables are not repeated; the palette section links `docs/contrast.md`.
- Present tense, lookup voice: a heading, then short paragraphs or one bullet per mechanism. No paragraph over six lines.
- File paths stay in backticks and must exist. The yellow rule, the hero AA exemption (no scrim, no halo, no shader darkening; the `prefers-contrast: more` layer is the sole exception), the light-chapter scope mechanics (nine re-declared tokens; no `overflow` or `position` on `#chapter-light`; an alias is invisible to the scope; the exit veil is a sibling) keep their full explanation because they are the facts most likely to be "fixed" by mistake.
- Open with three lines: what this file is, who reads it (a session touching a surface), and where the rules are (`CLAUDE.md`).
- `dropped-facts.md` also lists the code standards Task 5 does not keep, so Kevin can veto: "no `@apply`", "prefer `@react-spring/three` or Framer Motion 3D over `useFrame`" (contradicts the scene's one-`useFrame` design and names uninstalled libraries), "measure with Lighthouse before calling anything done".

**Acceptance check:** Path check prints nothing. `grep -c ' — ' docs/architecture.md` is 0. `grep -c '^## ' docs/architecture.md` is 13 and `grep -c '^### ' docs/architecture.md` is at least 10. Constants: `for c in 620 287 550svh 130svh SEAM_WIDTH_EM SEAM_SIGMA_EM rootMargin '0.22' 'p·4.5' 'prefers-contrast'; do grep -q -- "$c" docs/architecture.md || echo "MISSING $c"; done` prints nothing. `tmp/house-cleaning/dropped-facts.md` exists, every line has a reason, and it names the three code standards above.

**Boundaries:** Do not consult the code to add facts the source does not carry; this task moves and restructures, the PR review checks against code. Do not edit `CLAUDE.md`.

- [x] **Step 1:** `git show origin/staging:CLAUDE.md > tmp/house-cleaning/claude-staging.md`; read the source blocks once.
- [x] **Step 2:** Write headings 1 to 7 (palette through light chapter); run the path check.
- [x] **Step 3:** Write heading 8 (the scene) with its sub-headings; run the constants check.
- [x] **Step 4:** Write headings 9 to 13; write `dropped-facts.md`; run the full acceptance check.
- [x] **Step 5:** Tick; commit `docs: architecture.md holds how each surface works`.

### Task 5: `CLAUDE.md` rewrite

**Files:**
- `CLAUDE.md`: modify: full rewrite. Nothing else.

**Interfaces:**
- Consumes: `docs/architecture.md` headings (Task 4), `docs/contrast.md` (Task 3), the archive path (Task 2).
- Produces: the `## Where things live` table that `CONTEXT.md` (Task 6) no longer carries.

**Work:** Sections, in order, each with a target length:

1. `# Portfolio, Claude instructions` and three lines: what the site is; the stack in one line (React 19, TypeScript strict, Vite 6 + SWC, Tailwind v4 via CSS `@theme`, Framer Motion, GSAP, React Three Fiber with `@react-three/postprocessing` for the Selected Work scene only, react-i18next, npm); "how it works: `docs/architecture.md`".
2. `## Branches and deploy (read before any merge)`. Kept from the source, facts and order intact: a push or merge to `main` auto-deploys through Cloudflare Workers Builds, connected to the repository directly, not through GitHub Actions; the absence of `.github/workflows` is not evidence nothing ships; the standing rule that `main` is frozen until Kevin says the revamp is finished; promoting `staging` to `main` is a production release needing a per-action decision, and blanket permission to "merge" does not cover it; if a merge's real scope differs from what was asked, stop and confirm. NEW paragraph: "`staging` is the integration branch and it sits behind `~/.claude/bin/block-merge-to-main.sh` together with `main`: merging a PR into it needs Kevin's per-action say-so, and the one authorised command is prefixed `ALLOW_MAIN_MERGE=1`. Feature-branch commits, pushes and PR creation need no permission." The hook path is written as `~/.claude/bin/block-merge-to-main.sh` (the source's `bin/…` form does not exist in the repo). The incident in two sentences: date 2026-09-02, 153 commits, production served the unreleased redesign for about 15 hours, caught by Kevin, not by any check. The three recovery steps and the curl verification line with the two `theme-color` values, kept. "Never roll back by deleting work from `staging`." About 30 lines.
3. `## Verification`. `npx tsc -b` (or `npm run build`); why `npx tsc --noEmit` is a no-op (`"files": []` plus references, exits 0 on code that does not compile); kill 4173 before e2e (`lsof -ti:4173 | xargs kill -9`) and why (`reuseExistingServer: !process.env.CI` reuses a stale preview); a runtime error inside a canvas is invisible to DOM assertions and `tests/e2e/scene-scrub.spec.ts` is the only guard; a rendered surface also verifies with a headless browser smoke (loads, root renders, zero console errors). About 12 lines.
4. `## Standing rules`. Bilingual `{ en, pt }` from the first commit; every animation honours `prefers-reduced-motion`; animation lanes (GSAP is entrance orchestration only; Framer owns state-driven and scroll-scrubbed motion; the R3F frame loop reads Framer MotionValues and writes three objects itself; never two lanes on one animation); the contrast audit rule pointing at `docs/contrast.md`; `·` not spaced em-dashes in reader-facing prose; spec and plan checkbox discipline (the source's five rules, tightened to ten lines); code standards: no `any`, explicit return types on hooks and utilities, functional components with a props interface above, `gsap.context()` with cleanup, `will-change` only while animating, lazy-load canvas sections, extract repeated Tailwind patterns to components. About 25 lines.
5. `## NO`. The fifteen items from spec decision 4, one line each with the reason in a few words.
6. `## Where things live`. Table: rules (`CLAUDE.md`), how it works (`docs/architecture.md`), contrast (`docs/contrast.md`), glossary (`CONTEXT.md`), decisions (`docs/adr/`), live specs and plans (`docs/superpowers/specs/`, `docs/superpowers/plans/`), archive (`docs/superpowers/archive/`), resume note (`HANDOFF.md`, ignored), e2e and unit tests (`tests/e2e/`, `tests/unit/`), content types (`src/types/content.ts`), content data (`src/data/`, including `src/data/embeds.csv`).

Deleted outright: Content Types (its facts moved to `docs/architecture.md#content-model` in Task 4), Architecture tree, Existing MVP Notes, Skill Invocation Rules, Context7 Trigger Libraries, Design Direction prose, both contrast tables.

**Acceptance check:** `wc -l CLAUDE.md` is at most 120. `grep -ci 'superpowers:\|frontend-design\|context7\|useSmoothScroll\|App.tsx' CLAUDE.md` is 0. `grep -c 'tsc --noEmit' CLAUDE.md` and `grep -c 'ALLOW_MAIN_MERGE=1' CLAUDE.md` are each at least 1. `grep -c ' — ' CLAUDE.md` is 0. Path check and anchor check print nothing.

**Boundaries:** No new rule that was not in the source or in the spec. The hook is named, never quoted or edited.

- [x] **Step 1:** Write sections 1 to 3; `wc -l` under 60.
- [x] **Step 2:** Write sections 4 to 6; run the full acceptance check.
- [x] **Step 3:** Tick; commit `docs: CLAUDE.md is rules only`.

### Task 6: `CONTEXT.md` rewrite

**Files:**
- `CONTEXT.md`: modify. Nothing else.

**Interfaces:**
- Consumes: `CLAUDE.md` (Task 5) as the home of the records table; `docs/architecture.md` headings (Task 4).

**Work:**
- Opening paragraph: drop the perf-harness clause and every line-number citation; keep the two-sentence description and "Every entry cites the file it was read from."
- `### Content` and `### Surface`: keep every term. Re-cite each without line numbers: code first (`src/types/content.ts`, `src/utils/palette.ts`, `src/components/ui/WorkRow.tsx`, `src/components/canvas/scene/SceneRig.tsx`), then ADR number, then `docs/architecture.md#<slug>`. `CLAUDE.md` is cited only for a rule (the em-dash rule, the lanes).
- `### Measurement`: delete the whole group (Rig, Layer 1/2/3, Scenario, Baseline, Pixel gate, Batch).
- `### Records`: Spec and Plan stay. Ledger goes. Add **ADR** (a decision with its reasoning under `docs/adr/`, numbered), **Architecture note** (`docs/architecture.md`: how a surface works today, one section per surface), **Archive** (`docs/superpowers/archive/`: a record of a retired system, never current truth). Redefine **HANDOFF**: "The resume note at the repo root, always present, never tracked. Superseded ones are renamed `HANDOFF-<slug>.archived.md` and kept on disk, ignored."
- `## Invariants`: keep each, re-cite without line numbers. The `@source` invariant goes. The perf invariant ("numbers are rig-relative") goes. Re-cites: em-dash → `CLAUDE.md`; preview is `wrangler dev` → `package.json`, ADR 0008; JSON-LD mirror → `tests/unit/seo/jsonld-projects.test.ts`; job titles historical → `src/data/workExperience.ts`; CV canonical at `~/keki/cv-rebuild` → no citation, marked "(Kevin's rule, outside the repo)". The deploy invariant is reworded so it agrees with `CLAUDE.md`: "Production ships from `main` on push through Cloudflare; `main` is frozen and `npm run deploy` is owner-only." → `package.json`, `CLAUDE.md`.
- `## Where the records live`: delete (lives in `CLAUDE.md` now).
- `## Known contradictions in the records`: delete; all three are resolved (README at HEAD, the CC-BY line in Task 7, the press-revamp vocabulary in Task 2 and ADR 0002).

**Acceptance check:** Citation check prints nothing. `grep -cE '^\*\*(Rig|Layer 1|Scenario|Baseline|Pixel gate|Batch|Ledger)\*\*' CONTEXT.md` is 0; `grep -c '@source\|perf/' CONTEXT.md` is 0. `grep -c 'archived.md' CONTEXT.md` is 1 (the HANDOFF definition). `grep -c '^\*\*' CONTEXT.md` is 26 (30 today, minus 7, plus 3). Path check and anchor check print nothing.

**Boundaries:** No implementation detail enters a definition. No new invariant. Terms are not renamed.

- [x] **Step 1:** Rewrite the opening, Content and Surface with new citations; run the citation check.
- [x] **Step 2:** Delete Measurement, rewrite Records, rewrite Invariants, delete the two trailing sections; run the full check.
- [x] **Step 3:** Tick; commit `docs: CONTEXT.md is a glossary again`.

### Task 7: ADR citations and README

**Files:**
- `docs/adr/0001-*.md` through `docs/adr/0008-*.md`: modify: every line-number citation (47 hits of the citation check across the eight files today, continuation forms included) becomes a citation without a line number, following the rule below. No other sentence changes, with two exceptions listed under Work. ADRs 0009 to 0011 carry none and are not touched.
- `README.md`: modify: tagline line 3 becomes "dark ink + webgl shader craft. lowercase, monumental, confident."; the preview line becomes `npm run preview  # build, then wrangler dev (the Workers runtime); npx vite preview --port 4173 for a static preview`; delete the CC-BY footer bullet; check the `structure` tree against `ls src src/components` and fix any directory that is wrong.

**Work:** Citation rule: `CLAUDE.md:n` → the `docs/architecture.md#<slug>` section that now holds the fact, or `CLAUDE.md` when the fact is a rule that stayed there; `HANDOFF*.md:n` and `HANDOFF-*.archived.md` → dropped, and if the sentence then has no source, cite the code or plan that holds the fact (for ADR 0003: `docs/superpowers/plans/2026-07-19-webgl-pivot.md`, "Plan risks, item 5"; verify with `grep -n 'Legacy CSS var aliases remain' docs/superpowers/plans/2026-07-19-webgl-pivot.md`); `README.md:n`, `package.json:n`, `playwright.config.ts:n`, `src/…:n`, spec `:n` → the same file without the number. Continuation citations (`` `:11-14` ``) are merged into the preceding one. Two content exceptions: ADR 0002 line 12's two archive file names become "the branch `design/work-first-press-revamp`" and "kept for their gotchas" becomes "kept for the record"; ADR 0002 line 13's claim that `package.json` carries neither `three` nor `@react-three/*` is false at HEAD and becomes "R3F returned for the Selected Work scene only (ADR 0009); the hero and backdrop stay raw WebGL".

**Acceptance check:** Citation check over `docs/adr/*.md` prints nothing. `grep -rn 'archived.md\|HANDOFF.md' CLAUDE.md README.md docs/` prints nothing except `CONTEXT.md`'s HANDOFF definition and this plan. Path check and anchor check over every edited ADR print nothing. `grep -c 'CC-BY\|soft blue' README.md` is 0. README tree: `for d in $(grep -oE '^\s+[a-zA-Z0-9]+/' README.md | tr -d ' /'); do test -d src/$d || test -d src/components/$d || echo "MISSING $d"; done` prints nothing (13 directories, `i18n` included).

**Boundaries:** ADR reasoning is not rewritten. No ADR is added or renumbered.

- [ ] **Step 1:** ADRs 0001 to 0004; run the citation check on each.
- [ ] **Step 2:** ADRs 0005 to 0008; run the citation, path and anchor checks.
- [ ] **Step 3:** README edits; run the README checks.
- [ ] **Step 4:** Tick; commit `docs: ADR citations and README match the tree`.

### Task 8: The global flow line

**Files:**
- `~/.claude/CLAUDE.md`: modify, two bullets only. Under `## Merge safety`, the "Branch flow" bullet becomes the text in spec decision 5, verbatim. Under `## Plans and review`, "open the PR against `ai-staging`" becomes "open the PR against the integration branch".

**Work:** Edit, then `git -C ~/.claude add CLAUDE.md && git -C ~/.claude commit -m "merge safety: a project may name its own integration branch" && git -C ~/.claude push`. `settings.json` is already modified in that repo and is NOT staged. Harness work under `~/.claude` runs in accept-edits mode; if auto mode blocks the write, stop and report `blocked: ~/.claude write denied`.

**Acceptance check:** `grep -c "unless the project's CLAUDE.md names another" ~/.claude/CLAUDE.md` is 1; `grep -c 'against the integration branch' ~/.claude/CLAUDE.md` is 1; `grep -c 'against `ai-staging`' ~/.claude/CLAUDE.md` is 0. `git -C ~/.claude status --short CLAUDE.md` is empty after the push. `git -C ~/.claude log -1 --oneline` shows the commit.

**Boundaries:** No other line of the global file. Not the hook. Not `settings.json`.

- [ ] **Step 1:** Edit the two bullets; run the greps.
- [ ] **Step 2:** Commit and push in `~/.claude`; confirm the log line.

### Task 9: Verification, handoff, PR

**Files:**
- `HANDOFF.md`: modify (ignored, not committed): the post-pass state: nothing pending, the branch and PR number, the two deferred items carried from the previous handoff (the `aspect = 1` regime boundary; the seam knobs), the dead ends list carried verbatim, and a note that the perf branch will conflict on `CONTEXT.md` and `CLAUDE.md` when it merges.
- `docs/superpowers/specs/2026-09-06-docs-house-cleaning-design.md`: modify: tick the TODO boxes whose checks pass (all but the PR box until it opens).

**Work:** Run, in this order, output kept: `npx tsc -b`, `npm run lint`, `npx vitest run`. All three must pass; a docs-only branch that fails any of them is a plan defect, stop and report. Push the branch. Open the PR with `gh pr create --base staging`, body: the document map table from the spec, the full `tmp/house-cleaning/dropped-facts.md` under "Dropped facts, veto any", the verification output summary, and the standard footer. Then the rundown for Kevin's manual pass: read `CLAUDE.md` top to bottom in under two minutes; open `docs/architecture.md#selected-work-scene` and confirm one constant against `src/utils/sceneMotion.ts`; run `git check-ignore -v HANDOFF.md perf/reports/x`; read the archive README; confirm the global flow line reads right.

**Acceptance check:** The three commands pass with output shown in the turn. `gh pr view --json baseRefName -q .baseRefName` prints `staging`. Every spec TODO box is ticked once the PR URL exists.

**Boundaries:** No merge. The review is Kevin's to trigger, and the merge into `staging` needs his `ALLOW_MAIN_MERGE=1`.

- [ ] **Step 1:** Run the three commands; keep the output.
- [ ] **Step 2:** Rewrite `HANDOFF.md`.
- [ ] **Step 3:** Push, open the PR, tick the spec boxes and this task's boxes; commit `docs: house-cleaning spec boxes ticked`; push.
- [ ] **Step 4:** Post the rundown and stop.
