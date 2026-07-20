# HANDOFF — portfolio content sync (headline, open-to-work pill, jobs, skills)

> Fresh-context handoff written 2026-07-03 evening, after the CV round-5b session. The prior
> handoff (June bento/content revamp, a different task) is archived as
> `HANDOFF-bento-content-revamp.archived.md`.

## Goal

Sync the portfolio site's personal content with the freshly updated Portuguese CV
(`~/keki/cv-rebuild/cv-pt.html`, round 5b). Done means, verified in a local render:

1. **Headline** says "senior software developer" (EN) instead of "senior front-end developer",
   with the pt-BR locale mirrored ("desenvolvedor de software sênior" or the existing casing
   convention; the CV equivalent is "Engenheiro de Software Sênior · Full-Stack (React /
   TypeScript / Node.js)", so carry the full-stack qualifier if the layout has room).
2. **"OPEN TO WORK" pill REMOVED from the nav bar** (user showed a screenshot of the pill in
   the top-right nav). Remove the element; check whether the same open-to-work copy also
   renders elsewhere (footer/contact) before deleting shared strings.
3. **Job descriptions synced** with the CV's round-5 experience bullets.
4. **Skills synced** with the CV's round-5 skills grid (notably the new `php` chip in
   backend & cloud).
5. Tests/lint/build green, committed on a branch, merged to main, pushed.
   **Do NOT deploy: the user said they will run the deploy manually later** (wrangler is not
   authenticated on this machine anyway; `npx wrangler whoami` says not authenticated).

## Source of truth for content

- **`~/keki/cv-rebuild/cv-pt.html` is the ONLY current CV.** The EN CV
  (`~/keki/cv-rebuild/cv.html`) is STALE (round-3 state, still says Front-End) and must NOT be
  used as the EN source; translate EN site copy from the PT CV instead.
- CV round-5 experience content (all in the RBS entry unless noted):
  - Painel da Reconstrução award bullet (unchanged from site's current state).
  - Enquetes GZH bullet now includes backend detail: "modelei a camada de dados dos votos com
    contagem atômica e atualização em tempo real, construí um back-office autenticado (login
    Google restrito aos domínios corporativos) para o CRUD e implementei controle de acesso
    por origem via regras de segurança e uma Cloud Function."
  - NEW Radar Legislativo bullet (pré-lançamento, architecture only, NO metrics allowed):
    API REST NestJS + PostgreSQL/TypeORM (migrations, filas Redis/Bull, raspagem diária dos
    dados abertos da Câmara via cron), back-office editorial autenticado em Next.js, pipeline
    de IA com revisão e aprovação humana antes da publicação, CI/CD GitLab (testes, Docker,
    Kubernetes no GCP).
  - Hubcount bullet gained "absorvendo as regras de negócio do domínio contábil".
  - Resumo gained a backend clause: "atuação também no back-end, com APIs REST e serviços em
    Node.js/NestJS, modelagem de dados relacionais (PostgreSQL) e deploy conteinerizado em
    Docker" and now opens "Engenheiro de software sênior".
- CV skills grid (round 5): 01 frontend (react, next.js, typescript, angular, tailwind css,
  html/css, sass) · 02 design (d3.js, gsap, framer motion, figma, photoshop, after effects,
  blender) · 03 backend & cloud (node.js, nestjs, **php**, gcp, aws, cloudflare, firebase) ·
  04 devops & testes (git, ci/cd, npm, webpack, vite, jest, jasmine, karma) · 05 engenharia de
  ia (integração de apis de llm, rag, embeddings/busca vetorial, engenharia de prompts/evals,
  agentic coding, agentes de ia, mcp/tool use) · 06 liderança (liderança técnica, mentoria,
  comunicação com stakeholders, code review, planejamento de sprints, agile/scrum, jira).
- Context: this whole round exists because of a **PHP developer job referral** (see
  `~/keki/cv-rebuild/php-transition/cv-alignment-notes.md`). The `php` skill chip was added at
  the user's explicit instruction (he has no PHP yet; do not add further PHP claims anywhere).

## State

- **Portfolio repo** (`~/keki/dev/personal_projects/portfolio`): branch `main` at `54d0fbe`
  ("feat(projects): add radar legislativo case study (pre-launch)"), clean tree, pushed to
  `origin/main`. **kevinshibuya.com does NOT yet show this commit** (deploy pending, manual,
  user's call).
- Radar Legislativo is already a featured project entry (highlightOrder 2, size md) with
  mockups in `public/images/projects/radar-legislativo/`; JSON-LD in `index.html` and two
  tests were updated for 9 featured projects. All 73 unit tests pass.
- **Where the content lives** (recon done, files not yet read in full):
  - `src/data/workExperience.ts` — bilingual job entries (titles like "Frontend Developer II"
    at lines ~8-9, ~42-43, ~75; bullets presumably inline). This is the target for change 3.
    Job TITLES are historical facts and stay as they are; only descriptions/summary sync.
  - `src/data/skills.ts` — skills groups (keys like 'frontend'); target for change 4.
  - `src/i18n/locales/` — UI strings; the "senior front-end developer" headline and the
    "OPEN TO WORK" pill copy are NOT in src/data (grep found neither in data files); look here
    and in the nav component (`grep -rin "open" src/i18n src/components | grep -i work`).
  - `src/data/stats.ts`, `src/data/social.ts` — check for role strings while at it.
  - `index.html` — head metadata mentions front-end wording (grep matched it); update meta
    description/JSON-LD person description if they carry the old title.
- No dev servers running. cv-rebuild is not a git repo; its own HANDOFF.md tracks CV state.

## What worked / what didn't (this session's lessons that apply here)

- **Content tests assert counts and sync**: `tests/unit/seo/jsonld-projects.test.ts` (JSON-LD
  in index.html must mirror src/data/projects.ts, positions contiguous) and
  `tests/unit/data/archive.test.ts` (hardcoded featured count, currently 9). Any content
  change that touches projects or index.html JSON-LD likely needs test updates: run tests
  FIRST to get the baseline, edit, re-run.
- **Em-dash ban**: never a spaced " — " as sentence punctuation in ANY reader-facing prose
  (memory `em-dash-aversion`). Site copy style in data files is lowercase for
  pitch/tagline/whatShipped fields.
- **Deploy is fenced**: `npm run deploy` was denied by the permission classifier without an
  explicit user green light, and wrangler is unauthenticated regardless. User will deploy.
- Git flow that worked: feature branch → commit → `git checkout main` + assert branch →
  `git merge --ff-only` + assert HEAD moved → push (zsh `set -e` does not stop on checkout
  abort; see global CLAUDE.md).

## Verify

```bash
cd ~/keki/dev/personal_projects/portfolio
git status --porcelain && git log --oneline -1   # expect clean @ 54d0fbe (or newer)
npm run test:unit                                 # expect 73 passing (13 files)
npm run lint                                      # 7 pre-existing warnings, 0 errors
npm run build                                     # tsc -b && vite build, green
npm run dev -- --port 5199                        # local render; port 5173 may be taken
```

## Next action

1. `grep -rin "front-end\|open to work" src/i18n/ src/components/ index.html` to pin the exact
   headline + pill strings (they are NOT in src/data). Read `src/i18n/locales/*` and the nav
   component.
2. Read `src/data/workExperience.ts` and `src/data/skills.ts` in full; diff their content
   against the CV source-of-truth section above; write the EN translations from the PT CV.
3. Apply: headline (en+pt), remove pill from nav, sync job descriptions (add Radar bullet,
   enrich Enquetes/Hubcount, keep historical job TITLES as they are), add `php` to the
   backend skills group.
4. Local render check (dev server + screenshot), tests/lint/build, branch/commit/merge/push.
   NO deploy.
