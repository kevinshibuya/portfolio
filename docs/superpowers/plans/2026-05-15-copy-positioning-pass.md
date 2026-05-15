# Copy Positioning Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's journalism-led copy on every primary "selling" surface with builder-first, founder/CD-resonant copy in both EN and PT, per the anchor sentence: *"i take rough ideas to polished, shipped products — design, engineering, and clear communication, in one person."*

**Architecture:** Pure content edit. Only two files change — `src/i18n/locales/en.json` and `src/i18n/locales/pt.json`. No component changes, no new keys, no new sections. All target strings already exist; we're replacing values in-place. Existing render paths (`<strong>` HTML in `hero.description`, `<em>` HTML in section titles) keep working because we preserve the markup conventions.

**Tech Stack:** react-i18next + JSON locale files. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-05-15-copy-positioning-pass-design.md`

---

## File Map

- **Modify:** `src/i18n/locales/en.json` — 14 string replacements across `hero.*`, `nav.*`, `sections.*.description`, `sections.contact.subtitle`.
- **Modify:** `src/i18n/locales/pt.json` — same 14 keys, PT equivalents.

No test files: this project has no automated copy tests. Verification is **visual** — load the dev preview, walk every surface in both languages, confirm fit and no overflow.

---

## Task 1: Replace EN hero strings

**Files:**
- Modify: `src/i18n/locales/en.json` (keys `hero.roles[0..3]`, `hero.description`, `hero.stats.years`, `hero.stats.embeds`, `hero.stats.projects`)

- [x] **Step 1: Replace `hero.roles` array**

In `src/i18n/locales/en.json`, find:

```json
    "roles": [
      "interactive storyteller",
      "fullstack developer",
      "system architect",
      "data journalist"
    ],
```

Replace with:

```json
    "roles": [
      "interactive developer",
      "design-engineer",
      "product builder",
      "data storyteller"
    ],
```

- [x] **Step 2: Replace `hero.description`**

Find:

```json
    "description": "<strong>full-stack developer</strong> specializing in interactive journalism and digital experiences — transforming <strong>data and narratives</strong> into engaging <strong>visual stories.</strong>",
```

Replace with:

```json
    "description": "i take <strong>rough ideas</strong> to <strong>polished, shipped products</strong> — design, engineering, and clear communication, in one person.",
```

- [x] **Step 3: Replace `hero.stats` labels**

Find:

```json
    "stats": {
      "years": "years of experience",
      "embeds": "interactives published",
      "projects": "featured projects"
    }
```

Replace with:

```json
    "stats": {
      "years": "years shipping",
      "embeds": "interactives shipped",
      "projects": "case studies"
    }
```

- [x] **Step 4: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json','utf8')); console.log('OK')"`
Expected output: `OK`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/en.json
git commit -m "feat(copy): builder-first hero copy (EN)"
```

---

## Task 2: Replace EN nav + section + contact strings

**Files:**
- Modify: `src/i18n/locales/en.json` (keys `nav.available`, `sections.projects.description`, `sections.archive.description`, `sections.work.description`, `sections.skills.description`, `sections.contact.subtitle`)

- [ ] **Step 1: Replace `nav.available`**

Find: `"available": "available for projects"`
Replace with: `"available": "open for new projects"`

- [ ] **Step 2: Replace `sections.projects.description`**

Find: `"description": "asymmetric grid of my most important recent projects.",`
Replace with: `"description": "recent work taken end-to-end. brief → shipped → in the wild.",`

- [ ] **Step 3: Replace `sections.archive.description`**

Find: `"description": "everything I've shipped — interactives, projects, experiments.",`
Replace with: `"description": "every interactive, product, and experiment i've shipped. searchable.",`

- [ ] **Step 4: Replace `sections.work.description`**

Find: `"description": "seven years across newsrooms, agencies, and product teams — building interactive experiences for millions.",`
Replace with: `"description": "seven years shipping for newsrooms, agencies, and product teams — work seen by millions.",`

- [ ] **Step 5: Replace `sections.skills.description`**

Find: `"description": "a toolkit built around building fast, building right, and building with care.",`
Replace with: `"description": "the stack i use to take ideas from brief to ship — fast, without cutting craft.",`

- [ ] **Step 6: Replace `sections.contact.subtitle`**

Find: `"subtitle": "have a project in mind or just want to say hi? i'd love to hear from you.",`
Replace with: `"subtitle": "have a project, a rough idea, or a brief that needs a builder? tell me about it.",`

- [ ] **Step 7: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 8: Commit**

```bash
git add src/i18n/locales/en.json
git commit -m "feat(copy): sharpen nav + section + contact copy (EN)"
```

---

## Task 3: Replace PT hero strings

**Files:**
- Modify: `src/i18n/locales/pt.json` (keys `hero.roles[0..3]`, `hero.description`, `hero.stats.years`, `hero.stats.embeds`, `hero.stats.projects`)

- [ ] **Step 1: Replace `hero.roles` array**

Find:

```json
    "roles": [
      "contador de histórias",
      "desenvolvedor fullstack",
      "arquiteto de sistemas",
      "jornalista de dados"
    ],
```

Replace with:

```json
    "roles": [
      "desenvolvedor interativo",
      "designer-desenvolvedor",
      "criador de produtos",
      "contador de histórias de dados"
    ],
```

- [ ] **Step 2: Replace `hero.description`**

Find:

```json
    "description": "<strong>desenvolvedor full-stack</strong> especializado em jornalismo interativo e experiências digitais — transformando <strong>dados e narrativas</strong> em <strong>histórias visuais envolventes.</strong>",
```

Replace with:

```json
    "description": "eu levo <strong>ideias cruas</strong> a <strong>produtos prontos e polidos</strong> — design, engenharia e comunicação clara, numa pessoa só.",
```

- [ ] **Step 3: Replace `hero.stats` labels**

Find:

```json
    "stats": {
      "years": "anos de experiência",
      "embeds": "interativos publicados",
      "projects": "projetos em destaque"
    }
```

Replace with:

```json
    "stats": {
      "years": "anos entregando",
      "embeds": "interativos entregues",
      "projects": "estudos de caso"
    }
```

- [ ] **Step 4: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/pt.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 5: Commit**

```bash
git add src/i18n/locales/pt.json
git commit -m "feat(copy): builder-first hero copy (PT)"
```

---

## Task 4: Replace PT nav + section + contact strings

**Files:**
- Modify: `src/i18n/locales/pt.json` (keys `nav.available`, `sections.projects.description`, `sections.archive.description`, `sections.work.description`, `sections.skills.description`, `sections.contact.subtitle`)

- [ ] **Step 1: Replace `nav.available`**

Find: `"available": "disponível para projetos"`
Replace with: `"available": "aberto para novos projetos"`

- [ ] **Step 2: Replace `sections.projects.description`**

Find: `"description": "grade assimétrica dos meus projetos recentes mais importantes.",`
Replace with: `"description": "trabalhos recentes feitos ponta a ponta. do briefing à entrega — no ar.",`

- [ ] **Step 3: Replace `sections.archive.description`**

Find: `"description": "tudo que eu já publiquei — interativos, projetos, experimentos.",`
Replace with: `"description": "todo interativo, produto e experimento que entreguei. pesquisável.",`

- [ ] **Step 4: Replace `sections.work.description`**

Find: `"description": "sete anos entre redações, agências e equipes de produto — construindo experiências interativas para milhões.",`
Replace with: `"description": "sete anos entregando para redações, agências e times de produto — trabalhos vistos por milhões.",`

- [ ] **Step 5: Replace `sections.skills.description`**

Find: `"description": "um kit construído em torno de construir rápido, construir certo e construir com cuidado.",`
Replace with: `"description": "as ferramentas que uso para levar ideias do briefing à entrega — rápido, sem cortar acabamento.",`

- [ ] **Step 6: Replace `sections.contact.subtitle`**

Find: `"subtitle": "tem um projeto em mente ou só quer dizer oi? adoraria ouvir de você.",`
Replace with: `"subtitle": "tem um projeto, uma ideia ainda crua ou um briefing precisando de um builder? me conta.",`

- [ ] **Step 7: Verify JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/pt.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 8: Commit**

```bash
git add src/i18n/locales/pt.json
git commit -m "feat(copy): sharpen nav + section + contact copy (PT)"
```

---

## Task 5: Build verification

**Files:** none modified — verification only.

- [ ] **Step 1: Run a production build**

Run: `npm run build`
Expected: exit code 0. No TypeScript errors, no missing-translation warnings.

If build fails on a missing translation key, that's a sign one of the previous tasks deleted a key it shouldn't have. Fix by restoring the key and re-running.

- [ ] **Step 2: Eyeball the built bundle for the new copy**

Run:

```bash
/bin/bash -c 'grep -l "rough ideas" dist/assets/*.js >/dev/null && echo "EN copy present in bundle" || echo "MISSING — EN copy did not make it into the bundle"'
/bin/bash -c 'grep -l "ideias cruas" dist/assets/*.js >/dev/null && echo "PT copy present in bundle" || echo "MISSING — PT copy did not make it into the bundle"'
```

Expected:
```
EN copy present in bundle
PT copy present in bundle
```

If either prints MISSING, the JSON edit didn't land or the build is reading from a cached source. Re-check the locale file with `grep "rough ideas" src/i18n/locales/en.json`.

---

## Task 6: Preview-mode visual verification

**Files:** none modified — verification only.

Per memory `feedback_lighthouse_preview_not_dev`: always audit against `npm run preview` (port 4173), not the dev server.

- [ ] **Step 1: Start preview server in background**

Run: `npm run preview` (run_in_background)

Wait for the server to log `Local: http://localhost:4173/`.

- [ ] **Step 2: Walk EN surfaces**

In a browser at `http://localhost:4173/?lang=en`, eyeball each surface and confirm no line-wrap overflow, no broken `<strong>` rendering, no truncation:

- Hero — name, role cycler (cycles through 4 new roles), description (with bold accents on "rough ideas" and "polished, shipped products"), stats row, "open for new projects" pill in nav.
- Section 01 (projects) — "recent work taken end-to-end. brief → shipped → in the wild."
- Section 02 (archive) — "every interactive, product, and experiment i've shipped. searchable."
- Section 03 (work) — "seven years shipping for newsrooms, agencies, and product teams — work seen by millions."
- Section 04 (skills) — "the stack i use to take ideas from brief to ship — fast, without cutting craft."
- Section 05 (contact) — "have a project, a rough idea, or a brief that needs a builder? tell me about it."

- [ ] **Step 3: Walk PT surfaces**

In a browser at `http://localhost:4173/?lang=pt` (or click the EN/PT toggle), confirm every PT string lands with no overflow:

- Hero — role cycler ("desenvolvedor interativo" → "designer-desenvolvedor" → "criador de produtos" → "contador de histórias de dados"), description ("eu levo ideias cruas..."), stats, "aberto para novos projetos" pill.
- Section 01 — "trabalhos recentes feitos ponta a ponta..."
- Section 02 — "todo interativo, produto e experimento..."
- Section 03 — "sete anos entregando..."
- Section 04 — "as ferramentas que uso..."
- Section 05 — "tem um projeto, uma ideia ainda crua..."

Watch in particular for: hero description line-wrap (it's the longest sentence), `criador de produtos` and `contador de histórias de dados` fit (the longer role labels may push the cycler width).

- [ ] **Step 4: Browser dev tools — no missing-translation warnings**

Open the browser console. Expected: no `i18next::translator: missingKey` warnings.

- [ ] **Step 5: Stop the preview server**

Kill the background `npm run preview` process.

- [ ] **Step 6: Tick the spec TODOs**

Open `docs/superpowers/specs/2026-05-15-copy-positioning-pass-design.md` and change each `- [ ]` under `## TODO` that this plan satisfied to `- [x]`. The TODOs and their satisfying tasks:

- "Replace EN hero strings…" → Task 1
- "Replace EN nav availability string" → Task 2 Step 1
- "Replace EN section description/subtitle strings…" → Task 2 Steps 2–6
- "Replace PT hero strings to match" → Task 3
- "Replace PT nav availability string" → Task 4 Step 1
- "Replace PT section description/subtitle strings" → Task 4 Steps 2–6
- "`npm run build` passes…" → Task 5 Step 1
- "`npm run preview` — eyeball each surface…" → Task 6 Steps 2–3
- "Visual check that `<strong>` tags…" → Task 6 Step 2 (covered by hero walk-through)

- [ ] **Step 7: Commit the spec tick**

```bash
git add docs/superpowers/specs/2026-05-15-copy-positioning-pass-design.md
git commit -m "docs(spec): tick copy positioning pass TODOs"
```
