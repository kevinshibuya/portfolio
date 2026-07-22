# HANDOFF — work-first press revamp: execute Plan 1 (subagent-driven)

> Written 2026-07-17. Prior handoff (CV content sync, completed) archived as
> `HANDOFF-content-sync-cv5b.archived.md`.

## Goal

Execute **Plan 1** of the portfolio art-direction revamp: warm paper tokens + Scene 0 hero rebuild +
Scene 1 byline (incl. the reusable rosette-halftone shader primitive). Done = all 8 plan tasks
committed on the branch with every plan checkbox ticked, full verification table green (unit,
typecheck, lint, Playwright smoke desktop+mobile, build, Lighthouse ≥90 perf / ≥95 a11y on
`npx vite preview`), and the covered spec TODOs ticked in the spec.

Wider arc: the spec is an umbrella for 4 plans (1 tokens+hero+byline · 2 timeline+wipe ·
3 scene-3 playable artifacts · 4 archive+contact). Plans 2-4 are NOT yet written.

## State

- **Branch:** `design/work-first-press-revamp` at `77aa3a0`, clean tree, NOT pushed (local only).
  `main` is at `5972e7b`, untouched. All revamp work stays off main.
- **Spec (user-approved):** `docs/superpowers/specs/2026-07-17-work-first-press-revamp-design.md`.
  All 14 TODO boxes unticked. Contains the user-ratified decisions log — do NOT relitigate
  (lowercase voice, zero pins, press-in-3-moments, entrance inviolable, etc.).
- **Plan (gate-reviewed, final):** `docs/superpowers/plans/2026-07-17-press-revamp-1-tokens-hero-byline.md`.
  All checkboxes unticked. 8 tasks, each with a `**Model:**` assignment line
  (T1/T2/T6 editor-sonnet-low · T3 implementer-sonnet-medium · T4/T7/T8 integrator-opus-high ·
  T5 deep-reasoner-opus-xhigh). The pre-execution review gate ALREADY RAN (fresh Opus
  reviewer-opus-high + codex gpt-5.6-sol) and all findings are folded into the plan at `77aa3a0`
  — do not re-run the gate.
- **Execution mode (user-chosen):** subagent-driven, fresh subagent per task on the assigned model,
  orchestrator reviews between tasks. User said dispatch happens in this fresh window.
- **Design record:** `.superpowers/brainstorm/37825-1784301454/content/storyboard-v3.html`
  (+ decision trail files in the same dir). Visual Companion server (port 51042) is likely dead
  (4h idle timeout) — not needed for execution; mockups persist on disk.
- **Environment:** `npm ci` already run; Playwright chromium build 1217 installed. `tmp/shoot.mjs`
  is a gitignored throwaway screenshot script. Live site kevinshibuya.com still shows the old design.
- **Content deliverables owed by the user (placeholders exist in the plan meanwhile):** portrait
  photo (high contrast, strong key light, 4:5 ≥1200×1500), scanned handwriting note, and
  **confirmation of the real published-pieces count** ("249" is owner-supplied; stats.ts says
  "250+", embeds.csv has 162 rows — must be confirmed before Plan 4's archive masthead).

## What worked / what didn't

- **Plan-review gate caught real defects** (already fixed in the plan — context only): Task 1's
  token test was unsatisfiable (third `#F6F9FC` in `.loader-mark` index.css:324 + literals in
  index.html/site.webmanifest); period-glyph removal shortens the entrance by exactly one 80ms
  stagger (RULED acceptable + documented in Task 4 — do NOT "fix"/pad it); HalftonePortrait needs
  stale-mount init from `progress.get()` (in Task 7); `uMode` must be a float uniform (in Task 5).
- **Dispatch guardrails matter** (memory: implementers ignored single-line instructions twice):
  every task dispatch MUST structurally include: (a) tick each plan checkbox `- [ ]`→`- [x]`
  immediately after its step's command succeeds, before the next step; (b) RED acceptance tests in
  the plan are read-only — never edit them to pass; (c) never touch the spec file; (d) stay inside
  the task's Files list + Boundaries; (e) return `blocked: <reason>` instead of improvising.
- **jsdom gotchas** (both already baked into the plan's tests): HeroNameDrawing resolves
  entranceDone immediately in jsdom (tests mock it); setState above an in-flight
  whileInView(once) stagger freezes children at opacity 0 (pointer state via MotionValues only).
- **Harness quirks this session:** permission classifier intermittently returned
  "opus temporarily unavailable" for Bash — retry after a beat, read-only tools keep working. The
  Stop hook fires the QA gate on ANY file write (even gitignored) — record
  `~/.claude/bin/qa-run.sh --skip tier0 "<files> — no runtime code"` for docs-only turns; real
  code turns need the real tiers (tier1 typecheck/lint/unit, tier2 `npx playwright test`).
- **`npm run preview` is wrangler dev** — for Lighthouse/preview use `npx vite preview --port 4173`.
  Playwright's webServer builds + serves :4173 itself.

## Verify

```bash
cd ~/keki/dev/personal_projects/portfolio
git branch --show-current            # expect design/work-first-press-revamp
git log --oneline -3                 # expect 77aa3a0 (plan fixes), 0a1d191 (plan), 3ef0533 (spec)
git status --porcelain               # expect only untracked HANDOFF*.archived.md files
npm run test:unit                    # baseline green (73 tests / 13 files) BEFORE Task 1
npm run lint                         # 0 errors (7 pre-existing warnings OK)
npx tsc -b --noEmit                  # clean
```

## Next action

1. Baseline: run the Verify block above; all green before dispatching.
2. Dispatch **Task 1** (`## Task 1 — Warm paper neutral tokens`, model editor-sonnet-low) as a
   fresh subagent. Dispatch prompt must contain: repo path + branch name; the FULL task section
   text (or instruction to read exactly that section of the plan file); the five guardrails from
   "What worked" above verbatim; the plan file path for checkbox ticking.
3. On return: verify its commit + ticked boxes (`grep -n '\- \[ \]' <plan section>` should be
   empty for that task), spot-check the diff, run the task's Verify commands yourself.
4. Repeat for Tasks 2→8 in order (each task's Model line picks the agent). Tasks are sequential —
   shared working tree, interfaces build on each other.
5. After Task 8: run the plan's full Verification table, tick the covered spec TODOs (1, 2, 5, 12,
   partial 4/13/14) in the spec file, then invoke the code-review skill (NOT a raw agent dispatch —
   memory rule) for the branch review, then retro.
