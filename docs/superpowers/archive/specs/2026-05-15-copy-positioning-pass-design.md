# Copy Positioning Pass — Design

**Date:** 2026-05-15
**Owner:** Kevin Shibuya
**Scope:** Site-wide copy refresh on the primary "selling" surfaces.

## Why

Today's copy was written when the site read as a journalism-first portfolio. It still leads with "interactive journalism" and "data journalist," which lands for newsrooms but undersells Kevin to the audiences he actually wants to convert: **product / startup founders** and **agency / studio creative directors**.

Those decision-makers care about a different promise:

- "You take a fuzzy idea and ship a polished, interactive product."
- "Design, engineering, and communication live in the same person."
- "One person to talk to. No handoff gaps. Easy to work with."

The journalism background stays — but as **proof**, not the headline.

## Positioning thesis (anchor sentence)

> i take **rough ideas** to **polished, shipped products** — design, engineering, and clear communication, in one person.

Every line in this pass should ladder up to that sentence.

## Voice rules

These apply to every string we touch:

- Plain-English value over editorial flourish.
- Lead with a verb where possible (i build, i ship, i take).
- Outcomes and proof, not adjectives ("shipped" > "engaging").
- No SaaS clichés ("empowering", "turning visions into reality", "bridge the gap").
- Pick up Kevin's own phrasing ("rough ideas → polished products", "one place for all solutions") so it reads like him, not a template.
- Lowercase, no terminal periods except where current copy already uses them.

## Surfaces in scope

### 1. Hero (`src/i18n/locales/{en,pt}.json` → `hero.*`)

| Key | Before (EN) | After (EN) |
|---|---|---|
| `hero.roles[0]` | "interactive storyteller" | "interactive developer" |
| `hero.roles[1]` | "fullstack developer" | "design-engineer" |
| `hero.roles[2]` | "system architect" | "product builder" |
| `hero.roles[3]` | "data journalist" | "data storyteller" |
| `hero.description` | "**full-stack developer** specializing in interactive journalism and digital experiences — transforming **data and narratives** into engaging **visual stories.**" | "i take **rough ideas** to **polished, shipped products** — design, engineering, and clear communication, in one person." |
| `hero.stats.years` | "years of experience" | "years shipping" |
| `hero.stats.embeds` | "interactives published" | "interactives shipped" |
| `hero.stats.projects` | "featured projects" | "case studies" |

`hero.rolePrefix`, `hero.cta.collaborate`, `hero.cta.resume`, `hero.name1`, `hero.name2` stay as-is.

### 2. Nav (`nav.*`)

| Key | Before (EN) | After (EN) |
|---|---|---|
| `nav.available` | "available for projects" | "open for new projects" |

All other `nav.*` strings stay.

### 3. Section subtitles (`sections.*.description`)

| Section | Before (EN) | After (EN) |
|---|---|---|
| `sections.projects.description` | "asymmetric grid of my most important recent projects." | "recent work taken end-to-end. brief → shipped → in the wild." |
| `sections.archive.description` | "everything I've shipped — interactives, projects, experiments." | "every interactive, product, and experiment i've shipped. searchable." |
| `sections.work.description` | "seven years across newsrooms, agencies, and product teams — building interactive experiences for millions." | "seven years shipping for newsrooms, agencies, and product teams — work seen by millions." |
| `sections.skills.description` | "a toolkit built around building fast, building right, and building with care." | "the stack i use to take ideas from brief to ship — fast, without cutting craft." |
| `sections.contact.subtitle` | "have a project in mind or just want to say hi? i'd love to hear from you." | "have a project, a rough idea, or a brief that needs a builder? tell me about it." |

Section indices, labels, and titles stay (e.g., `01 · featured`, `selected <em>work.</em>`).

### 4. Footer

`footer.builtWith` ("built with react, typescript & care") and `footer.copyright` stay — already on-brand.

### 5. Portuguese parity

Every change above ships with a matched PT translation. PT rules:

- Same beats, same brevity, same direct register.
- Conversational — avoid formal "você" constructions where current copy is already informal.
- Don't translate technical idioms literally ("brief → shipped → in the wild" doesn't map word-for-word; preserve the *feel*, not the syntax).

Concrete PT proposals (subject to refinement during implementation):

| Key | After (PT) |
|---|---|
| `hero.roles[0]` | "desenvolvedor interativo" |
| `hero.roles[1]` | "designer-desenvolvedor" |
| `hero.roles[2]` | "criador de produtos" |
| `hero.roles[3]` | "contador de histórias de dados" |
| `hero.description` | "eu levo **ideias cruas** a **produtos prontos e polidos** — design, engenharia e comunicação clara, numa pessoa só." |
| `hero.stats.years` | "anos entregando" |
| `hero.stats.embeds` | "interativos entregues" |
| `hero.stats.projects` | "estudos de caso" |
| `nav.available` | "aberto para novos projetos" |
| `sections.projects.description` | "trabalhos recentes feitos ponta a ponta. do briefing à entrega — no ar." |
| `sections.archive.description` | "todo interativo, produto e experimento que entreguei. pesquisável." |
| `sections.work.description` | "sete anos entregando para redações, agências e times de produto — trabalhos vistos por milhões." |
| `sections.skills.description` | "as ferramentas que uso para levar ideias do briefing à entrega — rápido, sem cortar acabamento." |
| `sections.contact.subtitle` | "tem um projeto, uma ideia ainda crua ou um briefing precisando de um builder? me conta." |

## Out of scope (explicit)

These are flagged for a future copy pass, not this one:

- Individual project descriptions in `src/data/projects.ts` — each case study deserves its own positioning pass.
- Work-history role blurbs in `src/data/workExperience.ts` — same; those are proof and need their own pass.
- Layout additions like a "clients / outlets" trust strip near the hero — that's a layout/design change, not a copy change.
- Project detail page copy (`projectDetail.*`) — utilitarian strings; no positioning lift available.

## TODO

- [ ] Replace EN hero strings (`hero.roles`, `hero.description`, `hero.stats.*`) per the table above.
- [ ] Replace EN nav availability string.
- [ ] Replace EN section description/subtitle strings for projects, archive, work, skills, contact.
- [ ] Replace PT hero strings to match.
- [ ] Replace PT nav availability string.
- [ ] Replace PT section description/subtitle strings.
- [ ] `npm run build` passes (no broken interpolations or missing keys).
- [ ] `npm run preview` — eyeball each surface in EN and PT to confirm fit (line breaks, length, fontmetrics).
- [ ] Visual check that `<strong>` tags in `hero.description` still render in the bold-accent style the current copy uses.

## Verification

- Build green.
- Preview-mode walkthrough (per memory: lighthouse-against-preview-not-dev): visit each section in EN, toggle to PT, confirm no overflow / line-wrap regressions in the hero or section headings.
- No console errors / missing-translation warnings.
