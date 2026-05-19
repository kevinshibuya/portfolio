# About section — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. After each step's command lands successfully, edit the corresponding `- [ ]` to `- [x]` in this file before proceeding.

**Goal:** Ship a new bilingual `About` section between Hero and Projects that combines a 3-sentence bio with 4 numbered practice tactics, positioning Kevin as an AI-native fullstack engineer with a codified development practice.

**Architecture:** New `<About />` section component using the existing `SectionHeading` + `Stagger` primitives. Two-column editorial grid (sticky bio left + flat tactic rows right) with sand-bg-only hover, collapsing to single column under 900px. Copy lives in i18n JSON; body em-accents render via `<Trans>` with an `em` component (matching the existing Hero `<Trans>` pattern).

**Tech Stack:** React 19, TypeScript (strict), Framer Motion (via `Stagger`), react-i18next, TailwindCSS v4 (utilities only — section styles in `src/index.css`).

**Spec:** [`docs/superpowers/specs/2026-05-19-about-section-design.md`](../specs/2026-05-19-about-section-design.md)

---

## File structure

**Create:**
- `src/components/sections/About.tsx` — the section component
- `tests/unit/SectionHeading.test.tsx` — smoke test for the optional-index refactor (vitest config only includes `tests/unit/**`, co-located tests are ignored)

**Modify:**
- `src/components/ui/SectionHeading.tsx` — make `index` optional
- `src/i18n/locales/en.json` — add `sections.about.*` keys
- `src/i18n/locales/pt.json` — add `sections.about.*` keys (PT mirror)
- `src/index.css` — append About section style block
- `src/pages/Home.tsx` — render `<About />` between `<Hero />` and the `<Suspense>` block

---

### Task 1: Make `SectionHeading.index` optional

**Files:**
- Create: `tests/unit/SectionHeading.test.tsx` (vitest config only includes `tests/unit/**`)
- Modify: `src/components/ui/SectionHeading.tsx`

- [x] **Step 1: Write the smoke test**

Create `tests/unit/SectionHeading.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SectionHeading } from '../../src/components/ui/SectionHeading'

describe('SectionHeading', () => {
  it('renders the section index when provided', () => {
    render(<SectionHeading index="01 · featured" title="selected <em>work.</em>" />)
    expect(screen.getByText('01 · featured')).toBeInTheDocument()
  })

  it('omits the index span entirely when index is not passed', () => {
    const { container } = render(<SectionHeading title="how i <em>work.</em>" />)
    expect(container.querySelector('.section-index')).toBeNull()
  })
})
```

- [x] **Step 2: Run the test and verify the second case fails**

Run: `npm run test:unit -- SectionHeading`
Expected: First test passes. Second test fails with a TypeScript error (`index` is required) OR a render assertion (the `.section-index` span renders unconditionally).

- [x] **Step 3: Make `index` optional and conditionally render the index span**

Replace the contents of `src/components/ui/SectionHeading.tsx` with:

```tsx
interface SectionHeadingProps {
  index?: string
  label?: string
  /** Title accepts HTML with <em> for blue-accent italic (e.g. "selected <em>work.</em>") */
  title: string
  description?: string
}

export function SectionHeading({
  index,
  label,
  title,
  description,
}: SectionHeadingProps) {
  const indexText = index
    ? (label ? `${index} · ${label}` : index)
    : null

  return (
    <div className="section-header">
      {indexText && <span className="section-index">{indexText}</span>}
      <h2
        className="section-title"
        dangerouslySetInnerHTML={{ __html: title }}
      />
      {description && <p className="section-desc">{description}</p>}
    </div>
  )
}
```

- [x] **Step 4: Run the test and verify both pass**

Run: `npm run test:unit -- SectionHeading`
Expected: Both tests pass.

- [x] **Step 5: Verify full type check**

Run: `npx tsc --noEmit`
Expected: No errors. All existing callers (Projects, Archive, WorkExperience, Skills, Contact) still pass `index`, so no regression.

- [x] **Step 6: Commit**

```bash
git add src/components/ui/SectionHeading.tsx tests/unit/SectionHeading.test.tsx
git commit -m "refactor(section-heading): make index prop optional

Lets the About section render without an index number while
keeping the existing 01-05 indexed sections unchanged."
```

---

### Task 2: Add About i18n keys (EN + PT)

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

- [x] **Step 1: Add `sections.about` to en.json**

In `src/i18n/locales/en.json`, find the `"sections": {` object. Insert this block as the *first* property inside `sections` (before `projects`):

```json
    "about": {
      "title": "how i <em>work.</em>",
      "bio": "<em>fullstack</em>, <em>system design</em>, <em>ai engineering</em> — three things i practice on every product i build. seven years end-to-end across data viz, real-time systems, ai tooling, and sales funnels — with a <em>method</em> that compounds. brazilian, based in porto alegre.",
      "tactics": [
        {
          "num": "01",
          "title": "context budgets.",
          "body": "i treat the model's context window as a <em>first-class cost</em>, not a free resource — every dispatch and plan is sized against it before the work starts."
        },
        {
          "num": "02",
          "title": "skills over prompts.",
          "body": "repeated decisions get codified into <em>reusable skills</em> with explicit guardrails — that's how i keep hallucinations out of shipped code."
        },
        {
          "num": "03",
          "title": "retros that compound.",
          "body": "every non-trivial task ends with a small <em>retrospective</em> — the lesson gets written back into the skill library, so the next attempt is sharper, not the same."
        },
        {
          "num": "04",
          "title": "automation by snapshot.",
          "body": "flows i run more than twice get <em>captured as skills</em> — for example, the portfolio snapshot skill walks a repo, boots the frontend, mocks dead backends inline, and emits a typed <em>bundle another ai can ingest</em>: metadata, a technical brief, and an asymmetric set of desktop/mobile screenshots sized for downstream mockup templates."
        }
      ]
    },
```

- [x] **Step 2: Add `sections.about` to pt.json**

In `src/i18n/locales/pt.json`, insert as the *first* property inside `sections` (before `projects` or whatever the first entry is):

```json
    "about": {
      "title": "como eu <em>trabalho.</em>",
      "bio": "<em>fullstack</em>, <em>system design</em>, <em>ai engineering</em> — três frentes que toco em paralelo em todo projeto que entrego. sete anos de estrada cuidando do produto inteiro — visualização de dados, sistemas em tempo real, ai tooling, funis de conversão — e um <em>método</em> que vai somando. brasileiro, de porto alegre.",
      "tactics": [
        {
          "num": "01",
          "title": "orçamento de contexto.",
          "body": "encaro o context window como <em>custo de primeira classe</em>, não recurso infinito — toda chamada e cada plano é dimensionado em cima dele antes do trabalho começar."
        },
        {
          "num": "02",
          "title": "skills, não prompts soltos.",
          "body": "decisões que se repetem viram <em>skills reusáveis</em> com guardrails explícitos — é assim que alucinação não chega no código que sobe."
        },
        {
          "num": "03",
          "title": "retros que somam.",
          "body": "toda tarefa de peso termina com uma <em>retro</em> curta — o aprendizado volta pra biblioteca de skills, então a próxima tentativa sai mais afiada, não igual."
        },
        {
          "num": "04",
          "title": "automação por snapshot.",
          "body": "fluxos que repito mais de duas vezes viram <em>skills</em> — a skill de snapshot do portfólio, por exemplo, percorre o repo, sobe o front, mocka backends mortos inline e cospe um <em>bundle tipado pra outra ia consumir</em>: metadados, briefing técnico e um set assimétrico de screenshots desktop/mobile, dimensionado pros templates de mockup downstream."
        }
      ]
    },
```

- [x] **Step 3: Verify JSON validity**

Run:
```bash
node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json','utf8'))" \
  && node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/pt.json','utf8'))" \
  && echo "OK"
```
Expected: Prints `OK`.

- [x] **Step 4: Commit**

```bash
git add src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "i18n(about): add about section keys for en + pt

Bio + 4 numbered practice tactics, with <em>...</em> markers for
inline blue accents rendered via <Trans>. PT heading translated
('como eu trabalho.'); bio + tactic copy code-switches per the
locked native-voice pass."
```

---

### Task 3: Add About section CSS

**Files:**
- Modify: `src/index.css`

- [x] **Step 1: Locate the section boundary in `src/index.css`**

Find the comment block `/* ===== WORK EXPERIENCE ===== */` (or whichever block contains the `.work-*` rules ending around line ~820). The new About block goes *after* the WORK EXPERIENCE block and *before* the next section header.

- [x] **Step 2: Append the About section style block**

Insert the following block:

```css
/* =========================================================================
   ABOUT SECTION
   ========================================================================= */
.about-grid {
  display: grid;
  grid-template-columns: 1fr 1.55fr;
  gap: 80px;
  align-items: start;
  margin-top: 64px;
}
.about-bio-wrap { position: sticky; top: 96px; }
.about-bio {
  font-size: 20px;
  line-height: 1.55;
  color: var(--bark);
  font-weight: 400;
  padding-right: 16px;
  margin: 0;
}
.about-tactics { display: flex; flex-direction: column; }
.about-tactic {
  display: grid;
  grid-template-columns: 56px 1fr;
  gap: 24px;
  padding: 26px 16px;
  border-top: 1px solid var(--mist);
  align-items: start;
  transition: background 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}
.about-tactic:last-child { border-bottom: 1px solid var(--mist); }
.about-tactic:hover { background: var(--sand); }
.about-tactic-num {
  font-size: 13px;
  color: var(--dust);
  letter-spacing: 0.12em;
  font-feature-settings: 'tnum';
  padding-top: 6px;
}
.about-tactic-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.012em;
  text-transform: lowercase;
  margin: 0 0 10px;
  color: var(--ink);
}
.about-tactic-body {
  font-size: 16px;
  line-height: 1.6;
  color: var(--bark);
  max-width: 60ch;
  margin: 0;
}
.about-bio em,
.about-tactic-title em,
.about-tactic-body em {
  font-style: italic;
  color: var(--blue-400);
  font-weight: inherit;
}

@media (max-width: 900px) {
  .about-grid {
    grid-template-columns: 1fr;
    gap: 40px;
    margin-top: 36px;
  }
  .about-bio-wrap { position: static; }
  .about-bio { font-size: 18px; padding-right: 0; }
  .about-tactic { grid-template-columns: 40px 1fr; gap: 16px; padding: 22px 12px; }
  .about-tactic-title { font-size: 19px; }
}
```

- [x] **Step 3: Verify CSS compiles via build**

Run: `npm run build`
Expected: Build succeeds with no warnings. (The component isn't wired yet, so CSS will be present but unused — that's fine.)

- [x] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "style(about): add about section styles

Two-column editorial grid (sticky bio + flat tactic rows), sand-bg
hover, mobile single-column collapse. Inline em accents render
blue-400 per the design system."
```

---

### Task 4: Create the `About` component

**Files:**
- Create: `src/components/sections/About.tsx`

- [x] **Step 1: Write the component**

Create `src/components/sections/About.tsx`:

```tsx
import { Trans, useTranslation } from 'react-i18next'
import { Stagger } from '../ui/Stagger'
import { SectionHeading } from '../ui/SectionHeading'
import { STAGGER_PRESETS } from '../../utils/animations'

interface Tactic {
  num: string
  title: string
  body: string
}

export function About() {
  const { t } = useTranslation()

  const tactics = t('sections.about.tactics', {
    returnObjects: true,
  }) as Tactic[]

  return (
    <section id="about" className="section">
      <SectionHeading title={t('sections.about.title')} />

      <div className="about-grid">
        <div className="about-bio-wrap">
          <p className="about-bio">
            <Trans i18nKey="sections.about.bio" components={{ em: <em /> }} />
          </p>
        </div>

        <Stagger
          recipe="fadeUp"
          stagger={STAGGER_PRESETS.workRows}
          className="about-tactics"
        >
          {tactics.map((tactic, i) => (
            <div key={tactic.num} className="about-tactic">
              <span className="about-tactic-num">{tactic.num}</span>
              <div>
                <h3 className="about-tactic-title">
                  <Trans
                    i18nKey={`sections.about.tactics.${i}.title`}
                    components={{ em: <em /> }}
                  />
                </h3>
                <p className="about-tactic-body">
                  <Trans
                    i18nKey={`sections.about.tactics.${i}.body`}
                    components={{ em: <em /> }}
                  />
                </p>
              </div>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  )
}
```

- [x] **Step 2: Verify type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [x] **Step 3: Commit (component not yet wired — no visible effect)**

```bash
git add src/components/sections/About.tsx
git commit -m "feat(about): add About section component

Two-column editorial layout: sticky bio paragraph (rendered via
<Trans> for inline em accents) and a Stagger-revealed list of 4
numbered practice tactics sourced from i18n."
```

---

### Task 5: Wire `<About />` into `Home.tsx`

**Files:**
- Modify: `src/pages/Home.tsx`

- [ ] **Step 1: Add the import**

In `src/pages/Home.tsx`, add the import near the other section imports (alphabetical or grouped — match the existing convention):

```tsx
import { About } from '../components/sections/About'
```

- [ ] **Step 2: Render `<About />` between `<Hero />` and `<Suspense>`**

Find the `return` block (around line 201–214). Replace:

```tsx
  return (
    <main>
      <Hero />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} aria-hidden />}>
        <Projects />
```

with:

```tsx
  return (
    <main>
      <Hero />
      <About />
      <Suspense fallback={<div style={{ minHeight: '100vh' }} aria-hidden />}>
        <Projects />
```

- [ ] **Step 3: Run dev server and visually verify**

Run: `npm run dev`
Open `http://localhost:5173`:

Checklist:
- About section appears under Hero with heading "how i *work.*" (italic "work." in blue).
- Bio paragraph reads correctly in EN with blue-400 inline em accents (`fullstack`, `system design`, `ai engineering`, `method`).
- 4 tactic rows render with numbered prefixes 01–04, titles, and bodies.
- Hover any tactic row: sand-bg appears, no arrow, no nudge, no padding shift.
- Bio sticks at `top: 96px` while scrolling past the tactics column.
- Toggle EN ↔ PT via the nav toggle: copy swaps cleanly, layout doesn't shift, heading becomes "como eu *trabalho.*" in PT.
- Resize window to <900px: collapses to single column, bio un-sticks, tactic rows tighten.

- [ ] **Step 4: Verify production build**

Run: `npm run build`
Expected: Build succeeds, no warnings.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.tsx
git commit -m "feat(home): render About section under Hero

Inserted between Hero and the lazy Suspense block so the section
loads eagerly (it's the next thing under the fold and the
personality hook for recruiters)."
```

---

### Task 6: Verification + Lighthouse spot-check

**Files:** (none — verification only)

- [ ] **Step 1: Production build + preview**

Run: `npm run build && npm run preview`
Open `http://localhost:4173/`.
Expected: About section renders identically to dev mode.

- [ ] **Step 2: Full visual sweep EN + PT**

In `npm run preview`:
- Scroll Hero → About → Projects → Archive → Work → Stats → Skills → Contact → Footer.
- Switch EN ↔ PT at each section, confirm no layout shifts.
- Resize to common viewports: 1920×1080, 1440×900, 768×1024 (tablet), 375×812 (iPhone).
- Confirm hover on tactic rows works on desktop; tap states behave reasonably on touch (no sticky :hover artifacts).

- [ ] **Step 3: Reduced-motion check**

Open DevTools → Rendering → Emulate CSS media → `prefers-reduced-motion: reduce`. Reload.
Expected: Tactic rows appear via opacity-only fade (no transform stagger). Bio fades in via section-level reveal (no transform).

- [ ] **Step 4: Lighthouse mobile spot-check**

Run:
```bash
npx lighthouse http://localhost:4173/ \
  --form-factor=mobile \
  --throttling-method=simulate \
  --preset=perf \
  --output=json \
  --output-path=/tmp/lh-after-about.json \
  --chrome-flags="--headless=new"
```
Compare LCP + Performance score to today's baseline (mobile 96 / LCP 2.3s per the LCP spec). Expected delta: minimal. About is below-the-fold; LCP shouldn't shift. Watch TBT — if it climbed by more than ~20ms, the eager mount is paying a cost worth measuring before merge.

- [ ] **Step 5: Tick all spec TODOs**

Open `docs/superpowers/specs/2026-05-19-about-section-design.md` and edit every `- [ ]` TODO that's now satisfied to `- [x]`. Any TODO that genuinely doesn't apply gets an inline strikethrough comment, not a tick.

- [ ] **Step 6: Final commit (if any cleanup needed) and close**

If any small cleanup is needed (typo in copy, padding tweak), commit it. Otherwise the work is done at the end of Task 5.

```bash
git status     # should be clean
git log --oneline -8   # should show the chain of about/* commits
```

---

## Self-review

(per writing-plans skill instructions)

1. **Spec coverage:** All 16 spec TODO items map to a task:
   - `About.tsx` exists → Task 4
   - Rendered between Hero and Suspense → Task 5
   - Unnumbered section, indices stable → Task 1 (SectionHeading) + Task 5 (placement)
   - `SectionHeading.index` optional → Task 1
   - i18n keys EN + PT → Task 2
   - PT heading translated → Task 2 (step 2)
   - Two-column editorial layout → Task 3 (CSS) + Task 4 (markup)
   - Sticky bio → Task 3 (`.about-bio-wrap` rule)
   - Flat tactic rows + sand-bg hover only → Task 3
   - Mobile collapse → Task 3 (`@media` block)
   - `Stagger` reveal with `workRows` preset → Task 4
   - Reduced-motion verified → Task 6 (step 3)
   - Heading em blue-500, body em blue-400 → Task 3 (`.about-bio em` rule)
   - `npm run build` passes → Task 5 (step 4) + Task 6 (step 1)
   - Visual sweep EN/PT → Task 5 (step 3) + Task 6 (step 2)

2. **Placeholder scan:** No TBDs, no "add error handling," no "implement later." Every code block is complete.

3. **Type consistency:** `Tactic` interface declared in Task 4 matches the i18n shape declared in Task 2 (`{ num, title, body }`). Trans key paths use the indexed form `sections.about.tactics.${i}.title` consistently between markup and i18n structure.

4. **File paths:** All exact and verified against current repo structure.

---

## Execution

Plan complete. Per your global preferences (Max plan, ≥3 tasks → subagent-driven):

**Subagent-Driven** (recommended) — dispatch a fresh subagent per task, code-review subagent after Task 5 (before merging), retro after Task 6.

**Inline Execution** — work through tasks in this session via `superpowers:executing-plans`.

Which approach?
