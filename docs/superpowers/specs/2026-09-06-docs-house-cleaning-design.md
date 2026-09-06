# Documentation house-cleaning

**Date:** 2026-09-06 · **Owner:** Kevin · **Status:** approved in chat (grilling, twelve plus six questions)

## Problem

The agent-facing records have grown by accretion. `CLAUDE.md` is 243 lines, two thirds of it
how-it-works prose and contrast tables; `CONTEXT.md` documents a perf harness that exists only on an
unmerged branch; five session handoffs are tracked while the ignore rule for them sits in a local
exclude file; fifteen specs and plans describe systems the WebGL pivot retired; and the project's
mandatory skill rules name plugins that are not installed. Every session pays to load all of it.

## Decision: one home per fact

| File | Role | Reads it |
| --- | --- | --- |
| `CLAUDE.md` | Rules an agent obeys every turn. Under 120 lines. | every session |
| `docs/architecture.md` | How each surface works today. Restructured by surface and mechanism. | a session touching that surface |
| `docs/contrast.md` | The AA tables, recomputed as a unit on every token change. | a session touching a token |
| `CONTEXT.md` | Glossary and invariants. Citations by file and ADR, no line numbers. | a session needing the vocabulary |
| `README.md` | Humans: stack, getting started, tree. | people |
| `docs/adr/` | Decisions with reasoning. Unchanged in role. | on demand |
| `docs/superpowers/{specs,plans}/` | Records of live systems. | on demand |
| `docs/superpowers/archive/` | Records of retired systems. Never read for current truth. | archaeology |
| `HANDOFF.md` | The always-present resume note. Ignored. Archives stay on disk, ignored. | pickup |

## Settled decisions

1. `CLAUDE.md` loses: Content Types, Architecture tree, MVP notes, Skill Invocation Rules, Context7
   triggers, the Design Direction prose. It keeps: branch and deploy rules, a new Verification section,
   the pruned NO list, the standing rules, code standards, a where-things-live table.
2. The deploy incident is cut to the rule, the "no `.github/workflows` is not evidence" warning, two
   sentences of narrative with the date, and the three recovery steps.
3. Verification section, verbatim facts: `npx tsc -b` (a bare `--noEmit` is a no-op here); kill port
   4173 before e2e (`reuseExistingServer` reuses a stale preview); `tests/e2e/scene-scrub.spec.ts` is
   the only guard for runtime errors inside the canvas; rendered surfaces verify with a browser smoke.
4. The NO list keeps only prohibitions violable from the current code: a light theme outside the
   chapter, cards or bento, a fourth canvas, `@react-three/drei`, Anton outside the scene title, a halo
   on a card, a DOM element tracking the settled card, router or DOM access inside
   `src/components/canvas/`, section eyebrows or numerals, spaced em-dashes in prose, a CSS entry veil
   on the hero, the exit veil inside `#chapter-light`. Added after the plan review (the mistakes that break
   silently or read as an accessibility fix): a scrim, halo or shader darkening under the hero text
   (ADR 0004); a legacy alias (`--cream`, `--ink`, …) read inside `#chapter-light`; `overflow` or
   `position` on `#chapter-light`. Fifteen items.
5. `staging` stays the integration branch and stays behind the merge hook. The project doc says a
   staging merge needs Kevin's per-action say-so with `ALLOW_MAIN_MERGE=1`. The hook is untouched. The
   global `~/.claude/CLAUDE.md` flow line becomes:
   > Branch flow: feature branch → PR into the integration branch → (later, mine) PR from there into
   > staging/main. The integration branch is `ai-staging`, created from the default branch when missing,
   > unless the project's CLAUDE.md names another. A project that names `staging` keeps it behind the
   > hook: merging there needs my per-action say-so.
6. Archive by "system retired", not by date: every April to June spec and plan, the card-stack spec and
   plan, light-chapter plan A, and the page-animations retro.
7. The five tracked `HANDOFF-*.archived.md` are untracked and kept on disk. `HANDOFF*.md` moves from
   `.git/info/exclude` into `.gitignore`. `perf/reports/` is ignored. `.claude/RESUME.md` is deleted.
   Nothing under `perf/` or `tmp/` is deleted.
8. `CONTEXT.md` drops the perf-harness terms (Rig, Layer 1/2/3, Scenario, Baseline, Pixel gate,
   Batch), the Ledger, the `@source` invariant (no such line exists in `src/index.css`), the records
   table (moves to `CLAUDE.md`) and the resolved contradictions. HANDOFF is redefined per the table.
9. The architecture doc keeps every current fact from the prose it replaces, under thirteen headings
   (twelve surfaces plus a Content model section that takes the CSV and display facts from the deleted
   Content Types block). History clauses move to the ADR that holds them or are dropped; every dropped
   fact, and every code standard `CLAUDE.md` stops carrying, is listed in the PR description for veto.
10. `README.md`: tagline becomes the dark-ink direction, the CC-BY footer line goes, the preview line
    says `wrangler dev`.
11. Delivery: branch `docs/house-cleaning` off `origin/staging` (local `staging` is 33 commits stale
    and must not be the base), one commit per task, one PR into `staging`.
12. ADRs 0001 to 0008 lose their line-number citations (47 hits today) the same way `CONTEXT.md` does: file, ADR or
    architecture anchor, no line. Two false sentences in ADR 0002 are corrected while its file is open.
    The global `## Plans and review` bullet that says "against `ai-staging`" says "against the
    integration branch".

## Out of scope

Source code. The merge hook. The `perf/hero-harness` branch (it re-adds its glossary terms when it
merges and will conflict on `CONTEXT.md`; that is expected). Anything under `.superpowers/`.

## TODO

- [x] `CLAUDE.md` is at most 120 lines, names no missing skill or plugin, and every path it cites exists.
- [x] `docs/architecture.md` and `docs/contrast.md` exist; the contrast tables have the same row count as before the move.
- [x] `CONTEXT.md` has no line-number citation, no perf-harness term, no Ledger, no `@source` invariant.
- [x] No tracked file cites a `HANDOFF-*.archived.md`; `git check-ignore` resolves `HANDOFF*.md` and `perf/reports/` to `.gitignore`.
- [x] `docs/superpowers/archive/` holds the retired records as git renames, with a README; no live doc links to an old path.
- [x] No ADR carries a line-number citation; ADR 0002 no longer claims `three` is absent from `package.json`.
- [x] The global `~/.claude/CLAUDE.md` flow line matches decision 5, its review bullet names the integration branch, and both are pushed.
- [x] `npx tsc -b`, `npm run lint` and `npx vitest run` pass on the branch, output shown.
- [x] PR open against `staging` with the dropped-facts list in its description.
