# Project Detail — Editorial Digest Revamp · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Spec:** `docs/superpowers/specs/2026-05-17-project-detail-revamp-design.md`
>
> **Checkbox discipline:** Per `CLAUDE.md`, tick each `- [ ]` to `- [x]` immediately after that step's command/edit lands successfully — before moving to the next step.

**Goal:** Replace the freeform `story: Block[]` rendering on the 7 highlight project detail pages with a structured editorial digest — `Pitch` → desktop mockup → `WhatShippedRow` → `TrickCard` — cutting body copy from ~600 bilingual words to ~60 and fixing the mobile mockup off-axis bleed.

**Architecture:** Add three optional bilingual fields (`pitch`, `whatShipped`, `trick`) to `Project`. Build four new presentational components under `src/components/projectDetail/`. `ProjectDetail.tsx` renders the new components when the fields are present; if absent (any non-highlight detail page in the future), it falls back to the existing `BlockRenderer` + `StackSection` + `RouteList` flow — keeping the migration risk near zero and preserving the existing block-based story for hypothetical future projects.

**Tech Stack:** React 19, TypeScript (strict), Framer Motion, TailwindCSS v4, vanilla CSS in `src/index.css`, vitest, Playwright.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/types/content.ts` | Modify | Add `pitch`, `whatShipped`, `trick` optional bilingual fields to `Project` |
| `src/components/projectDetail/inlineMarkdown.tsx` | Modify | Add backtick code-span support to `parseInline` |
| `tests/unit/projectDetail/inlineMarkdown.test.tsx` | Modify | Add backtick test cases |
| `src/components/projectDetail/Pitch.tsx` | Create | Display-type lead with word-split fade-up |
| `src/components/projectDetail/MockupFrame.tsx` | Create | Framed, max-width-constrained, centered mockup wrapper |
| `src/components/projectDetail/WhatShippedRow.tsx` | Create | 2-col mobile-mockup + 1-sentence prose row |
| `src/components/projectDetail/TrickCard.tsx` | Create | Sand-bg card combining "the trick" prose + tech-pills stack |
| `src/index.css` | Modify | Add CSS for the 4 new components + inline `<code>` styling |
| `src/i18n/locales/en.json` | Modify | Add `projectDetail.whatShipped` and `projectDetail.trick` strings |
| `src/i18n/locales/pt.json` | Modify | Same, PT translations |
| `src/pages/ProjectDetail.tsx` | Modify | Render new components when new fields present; preserve fallback to existing flow |
| `src/data/projects.ts` | Modify | Add new fields + drop `story`, `routes`, `screenshots` on 7 highlight projects |

---

## Task 1 — Extend `parseInline` with backtick code-span support

**Files:**
- Modify: `src/components/projectDetail/inlineMarkdown.tsx`
- Modify: `tests/unit/projectDetail/inlineMarkdown.test.tsx`

The drafted copy uses backticks for technical terms (`?edit=1`, `localStorage`, `useState`, etc.). Currently `parseInline` only handles `**bold**`, `*italic*`, and `[link](url)` — backticks fall through as literal characters. Add inline `<code>` support so all three new components render technical terms correctly.

- [x] **Step 1: Add failing tests for backtick parsing**

Append these cases to `tests/unit/projectDetail/inlineMarkdown.test.tsx` inside the existing `describe('parseInline', ...)` block, before the closing `})`:

```tsx
  it('renders `code` as <code>', () => {
    expect(html('use `?edit=1` flag')).toBe(
      'use <code>?edit=1</code> flag'
    )
  })

  it('handles backticks alongside bold, italic, and link', () => {
    expect(html('**A** `code` *italic* [link](https://x.test)')).toBe(
      '<strong>A</strong> <code>code</code> <em>italic</em> <a href="https://x.test" target="_blank" rel="noopener noreferrer" class="prose-link">link</a>'
    )
  })

  it('treats unmatched backtick as literal', () => {
    expect(html('a `missing close')).toBe('a `missing close')
  })

  it('does not parse code inside an already-matched bold span', () => {
    // Bold matches first; the backticks inside are literal.
    expect(html('**`literal`**')).toBe('<strong>`literal`</strong>')
  })
```

- [x] **Step 2: Run the new tests and confirm they fail**

Run: `npm run test:unit -- inlineMarkdown`

Expected: the 4 new cases fail (the existing 7 still pass). Failure messages will show the backticks rendered literally.

- [x] **Step 3: Add backtick handling to `parseInline`**

Edit `src/components/projectDetail/inlineMarkdown.tsx`. Add a `CODE` regex near the other constants, and a new branch in the tokenizer loop.

Add this constant after the `LINK` regex (around line 16):

```ts
// Inline code: `text`. Inner edges require non-backtick characters to keep
// stray backticks ("`" used as a fancy quote) rendering as literal.
const CODE = /^`([^`]+)`/
```

Add this branch in the tokenizer loop, immediately before the `if (ch === '[')` block (around line 55):

```ts
    if (ch === '`') {
      const mC = rest.match(CODE)
      if (mC) {
        flushBuffer()
        out.push(<code key={key++}>{mC[1]}</code>)
        i += mC[0].length
        continue
      }
    }
```

- [x] **Step 4: Run all parseInline tests and confirm they pass**

Run: `npm run test:unit -- inlineMarkdown`

Expected: all 11 tests pass (7 existing + 4 new).

- [x] **Step 5: Commit**

```bash
git add src/components/projectDetail/inlineMarkdown.tsx tests/unit/projectDetail/inlineMarkdown.test.tsx
git commit -m "feat(prose): inline code-span support in parseInline"
```

---

## Task 2 — Add new `Project` fields and i18n keys

**Files:**
- Modify: `src/types/content.ts`
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

Pure plumbing. Fields are optional so no existing project breaks. i18n keys back the eyebrow labels in the new components.

- [x] **Step 1: Add the three optional fields to `Project`**

In `src/types/content.ts`, in the `Project` interface (around line 73-111), add three lines in the `// hero copy` block, right after the existing `stats?: Stat[]` line:

```ts
  // hero copy
  tagline?: Bilingual
  description: Bilingual
  stats?: Stat[]

  // editorial digest (highlight projects)
  pitch?: Bilingual
  whatShipped?: Bilingual
  trick?: Bilingual

  // links + meta
```

- [x] **Step 2: Add EN i18n keys**

In `src/i18n/locales/en.json`, inside the `"projectDetail": { ... }` object (around line 115-127), add two new keys after `"stack": "tech stack",`:

```json
    "stack": "tech stack",
    "whatShipped": "what shipped",
    "trick": "the trick",
    "liveDemo": "live demo",
```

- [x] **Step 3: Add PT i18n keys**

In `src/i18n/locales/pt.json`, inside `"projectDetail": { ... }` (around line 115-126), add two new keys after `"stack": "tecnologias",`:

```json
    "stack": "tecnologias",
    "whatShipped": "o que entregou",
    "trick": "o truque",
    "liveDemo": "demo ao vivo",
```

- [x] **Step 4: Verify typecheck still passes**

Run: `npx tsc -b`

Expected: no errors. (Fields are optional; no consumer changes yet.)

- [x] **Step 5: Commit**

```bash
git add src/types/content.ts src/i18n/locales/en.json src/i18n/locales/pt.json
git commit -m "feat(content): pitch/whatShipped/trick fields + i18n eyebrows"
```

---

## Task 3 — Add CSS for new components and inline `<code>`

**Files:**
- Modify: `src/index.css`

All four components plus the new `<code>` token share one CSS block. Adding it before component code lets us write each component's JSX with stable class hooks from the start.

- [x] **Step 1: Append the new CSS block**

Open `src/index.css`. Locate the end of `.project-detail-stack-chips { ... }` (around line 2009). Insert this block immediately after it, before `.project-detail-footnotes`:

```css
/* ============================================================
   Editorial digest — Pitch / MockupFrame / WhatShippedRow / TrickCard
   Used on highlight project detail pages. Shares <em>/<strong>/<code>
   visual treatment with .project-detail-paragraph.
   ============================================================ */

/* Shared inline tokens */
.project-detail-pitch em,
.project-detail-what-shipped-text em,
.project-detail-trick-body em {
  color: var(--blue-400);
  font-style: italic;
}
.project-detail-pitch strong,
.project-detail-what-shipped-text strong,
.project-detail-trick-body strong {
  font-weight: 600;
  color: var(--ink);
}
.project-detail-pitch code,
.project-detail-what-shipped-text code,
.project-detail-trick-body code,
.project-detail-paragraph code {
  background: var(--sand);
  color: var(--bark);
  padding: 0.05em 0.4em;
  border-radius: 6px;
  font-family: ui-monospace, monospace;
  font-size: 0.92em;
}

/* Pitch — display-type lead */
.project-detail-pitch {
  max-width: 880px;
  margin: 48px auto 40px;
  font-size: clamp(28px, 4vw, 56px);
  font-weight: 600;
  line-height: 1.1;
  letter-spacing: -0.01em;
  text-transform: lowercase;
  color: var(--ink);
}
/* MockupFrame — framed, centered, max-width constrained */
.project-detail-mockup-frame {
  margin: 32px auto 40px;
  display: block;
}
.project-detail-mockup-frame--desktop { max-width: 880px; }
.project-detail-mockup-frame--mobile  { max-width: 360px; }
.project-detail-mockup-frame img {
  width: 100%;
  height: auto;
  display: block;
  border-radius: 14px;
  object-fit: contain;
}

/* WhatShippedRow — 2-col: mobile mockup + short prose */
.project-detail-what-shipped {
  max-width: 880px;
  margin: 48px auto;
  display: grid;
  grid-template-columns: minmax(0, 360px) 1fr;
  gap: 48px;
  align-items: center;
}
@media (max-width: 720px) {
  .project-detail-what-shipped {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
.project-detail-what-shipped .project-detail-mockup-frame {
  margin: 0;
}
.project-detail-what-shipped-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin: 0 0 12px;
}
.project-detail-what-shipped-text {
  font-size: 17px;
  line-height: 1.5;
  color: var(--ink);
  margin: 0;
}

/* TrickCard — single card combining trick prose + tech pills */
.project-detail-trick {
  max-width: 880px;
  margin: 48px auto 64px;
  background: var(--sand);
  border-radius: 18px;
  padding: 32px;
}
@media (max-width: 720px) {
  .project-detail-trick { padding: 24px; }
}
.project-detail-trick-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin: 0 0 12px;
}
.project-detail-trick-body {
  font-size: 17px;
  line-height: 1.55;
  color: var(--ink);
  margin: 0;
}
.project-detail-trick-divider {
  border: 0;
  border-top: 1px solid var(--mist);
  margin: 24px 0;
}
.project-detail-trick-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
```

- [x] **Step 2: Verify the build still compiles**

Run: `npm run build`

Expected: build succeeds. No new components reference these classes yet, so this is purely additive CSS.

- [x] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat(css): editorial digest styles — pitch/mockup-frame/what-shipped/trick"
```

---

## Task 4 — Build `Pitch` component

**Files:**
- Create: `src/components/projectDetail/Pitch.tsx`

Display-type lead with word-split fade-up, mirroring the existing hero tagline animation pattern. Renders `parseInline` for `*em*` blue-italic accents and any `**bold**`/`` `code` ``/`[link](url)` markers.

- [x] **Step 1: Create the component file**

Create `src/components/projectDetail/Pitch.tsx` with this content (DONE):

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import type { Bilingual } from '../../types/content'

interface Props {
  text: Bilingual
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function Pitch({ text, lang }: Props) {
  const { prefersReducedMotion } = useMotion()
  const value = text[lang]

  // Single fade-up rather than the hero's word-split so multi-word italic
  // spans like "*data dashboard*" or "*real-time apps*" render correctly
  // through parseInline. The display type carries the entrance weight.
  return (
    <motion.p
      className="project-detail-pitch"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.7,
        ease: EASE,
      }}
    >
      {parseInline(value)}
    </motion.p>
  )
}
```

- [x] **Step 2: Verify typecheck passes**

Run: `npx tsc -b`

Expected: no errors.

- [x] **Step 3: Commit**

```bash
git add src/components/projectDetail/Pitch.tsx
git commit -m "feat(projectDetail): Pitch display-type lead with word-split reveal"
```

---

## Task 5 — Build `MockupFrame` component

**Files:**
- Create: `src/components/projectDetail/MockupFrame.tsx`

Shared framing for both desktop and mobile mockups. Constrains width and centers, fixing the off-axis bleed where the current `--wide` figure stretches the rotated-phones photo edge-to-edge.

- [ ] **Step 1: Create the component file**

Create `src/components/projectDetail/MockupFrame.tsx` with this content:

```tsx
import { motion } from 'framer-motion'
import { useMotion } from '../../context/MotionContext'

interface Props {
  src: string
  variant: 'desktop' | 'mobile'
  alt: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function MockupFrame({ src, variant, alt }: Props) {
  const { prefersReducedMotion } = useMotion()

  return (
    <motion.figure
      className={`project-detail-mockup-frame project-detail-mockup-frame--${variant}`}
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.6,
        ease: EASE,
      }}
    >
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </motion.figure>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc -b`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projectDetail/MockupFrame.tsx
git commit -m "feat(projectDetail): MockupFrame — centered, max-width-constrained image"
```

---

## Task 6 — Build `WhatShippedRow` component

**Files:**
- Create: `src/components/projectDetail/WhatShippedRow.tsx`

2-col layout: mobile mockup left, eyebrow + short sentence right. Stacks on `<768px`.

- [ ] **Step 1: Create the component file**

Create `src/components/projectDetail/WhatShippedRow.tsx` with this content:

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import { MockupFrame } from './MockupFrame'
import type { Bilingual } from '../../types/content'

interface Props {
  mobileSrc: string
  text: Bilingual
  lang: 'en' | 'pt'
  alt: string
}

const EASE = [0.22, 1, 0.36, 1] as const

export function WhatShippedRow({ mobileSrc, text, lang, alt }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()
  const value = text[lang]

  return (
    <section className="project-detail-what-shipped">
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: prefersReducedMotion ? 0.2 : 0.55, ease: EASE }}
      >
        <MockupFrame src={mobileSrc} variant="mobile" alt={alt} />
      </motion.div>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }}
        whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{
          duration: prefersReducedMotion ? 0.2 : 0.55,
          delay: prefersReducedMotion ? 0 : 0.12,
          ease: EASE,
        }}
      >
        <h2 className="project-detail-what-shipped-label">
          {t('projectDetail.whatShipped')}
        </h2>
        <p className="project-detail-what-shipped-text">{parseInline(value)}</p>
      </motion.div>
    </section>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc -b`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projectDetail/WhatShippedRow.tsx
git commit -m "feat(projectDetail): WhatShippedRow — mobile mockup + concise prose"
```

---

## Task 7 — Build `TrickCard` component

**Files:**
- Create: `src/components/projectDetail/TrickCard.tsx`

Single sand-bg card. Two stacked rows separated by a mist divider: "the trick" body + "stack" tech pills. Lifts the `Tag` pill styling from `StackSection`.

- [ ] **Step 1: Create the component file**

Create `src/components/projectDetail/TrickCard.tsx` with this content:

```tsx
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useMotion } from '../../context/MotionContext'
import { parseInline } from './inlineMarkdown'
import { Tag } from '../ui/Tag'
import type { Bilingual } from '../../types/content'

interface Props {
  trick: Bilingual
  stack: string[]
  lang: 'en' | 'pt'
}

const EASE = [0.22, 1, 0.36, 1] as const

export function TrickCard({ trick, stack, lang }: Props) {
  const { t } = useTranslation()
  const { prefersReducedMotion } = useMotion()

  return (
    <motion.section
      className="project-detail-trick"
      initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 24 }}
      whileInView={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{
        duration: prefersReducedMotion ? 0.2 : 0.5,
        delay: prefersReducedMotion ? 0 : 0.05,
        ease: EASE,
      }}
    >
      <h2 className="project-detail-trick-label">{t('projectDetail.trick')}</h2>
      <p className="project-detail-trick-body">{parseInline(trick[lang])}</p>

      {stack.length > 0 && (
        <>
          <hr className="project-detail-trick-divider" />
          <h2 className="project-detail-trick-label">{t('projectDetail.stack')}</h2>
          <div className="project-detail-trick-chips">
            {stack.map((tech) => (
              <Tag key={tech} label={tech.toLowerCase()} variant="pill" />
            ))}
          </div>
        </>
      )}
    </motion.section>
  )
}
```

- [ ] **Step 2: Verify typecheck passes**

Run: `npx tsc -b`

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/projectDetail/TrickCard.tsx
git commit -m "feat(projectDetail): TrickCard — trick prose + stack pills in one sand card"
```

---

## Task 8 — Wire new flow into `ProjectDetail.tsx`

**Files:**
- Modify: `src/pages/ProjectDetail.tsx`

Render the four new components when the three new fields are present. When absent (current state; will be true for all 7 highlights until Task 9 lands), fall back to the existing `BlockRenderer` + `StackSection` + `RouteList` + `Footnotes` flow. This zero-risk migration means the page never breaks between tasks.

- [ ] **Step 1: Replace the main render block**

In `src/pages/ProjectDetail.tsx`, locate the JSX inside `return ( <main> ... </main> )` (starts around line 74). Replace from `<section className="section">` through its closing `</section>` (lines 76-104) with:

```tsx
      <section className="section">
        <Hero project={project} lang={lang} />
        <ScrollCue />

        {project.pitch ? (
          /* Editorial digest path — new structured layout for highlights */
          <>
            <Pitch text={project.pitch} lang={lang} />
            {project.mockups?.desktop && (
              <MockupFrame
                src={project.mockups.desktop}
                variant="desktop"
                alt={`${project.title[lang]} desktop mockup`}
              />
            )}
            {project.mockups?.mobile && project.whatShipped && (
              <WhatShippedRow
                mobileSrc={project.mockups.mobile}
                text={project.whatShipped}
                lang={lang}
                alt={`${project.title[lang]} mobile mockup`}
              />
            )}
            {project.trick && (
              <TrickCard
                trick={project.trick}
                stack={project.techStack}
                lang={lang}
              />
            )}
          </>
        ) : (
          /* Legacy story path — kept for any non-highlight detail page */
          <>
            {project.story && project.story.length > 0 && (
              <div className="project-detail-story">
                <BlockRenderer blocks={project.story} project={project} lang={lang} />
              </div>
            )}
            <StackSection project={project} />
            {project.routes && project.routes.length > 0 && (
              <div className="project-detail-story">
                <RouteList
                  block={{
                    type: 'route-list',
                    routes: project.routes,
                    collapsible: project.routes.length > 8,
                  }}
                  lang={lang}
                />
              </div>
            )}
            <Footnotes project={project} />
          </>
        )}
      </section>
```

- [ ] **Step 2: Add the four new component imports**

At the top of the file, add these imports after the existing project-detail imports (around line 11). Keep the existing imports — they're still needed for the fallback path.

```tsx
import { Pitch } from '../components/projectDetail/Pitch'
import { MockupFrame } from '../components/projectDetail/MockupFrame'
import { WhatShippedRow } from '../components/projectDetail/WhatShippedRow'
import { TrickCard } from '../components/projectDetail/TrickCard'
```

The `ScrollCue` import was already wrapped in the legacy `{project.story && ...}` conditional. Move it out so it always renders (immediately after `<Hero>`, before the conditional). It's now unconditional — the existing import at line 7 stays.

**Note:** Step 1's JSX already shows `<ScrollCue />` rendering unconditionally between `<Hero>` and the conditional. The original code only rendered it when `project.story?.length > 0`. The new behavior matches the spec.

- [ ] **Step 3: Verify typecheck and build pass**

Run: `npx tsc -b && npm run build`

Expected: both succeed. Visually, all 7 highlight pages still render via the legacy fallback path because no project has `pitch` yet.

- [ ] **Step 4: Commit**

```bash
git add src/pages/ProjectDetail.tsx
git commit -m "feat(projectDetail): wire editorial-digest path with legacy fallback"
```

---

## Task 9 — Migrate the 7 highlight projects' data

**Files:**
- Modify: `src/data/projects.ts`

For each of the 7 highlights — `painel-da-reconstrucao`, `enquetes-gzh`, `ia-na-redacao`, `fotos-do-ano-2025`, `peleia-gre-nal`, `hotmart-bunde`, `fotos-do-ano-2024` — add the three new bilingual fields and remove `story`, `routes`, `screenshots`.

Copy is verbatim from the spec § "Drafted copy". This task is large but mechanical; doing it as one commit avoids leaving the data file in a half-migrated state.

- [ ] **Step 1: Edit `painel-da-reconstrucao`**

In `src/data/projects.ts`, locate the `id: 'painel-da-reconstrucao'` entry (line 5-127).

**Add** these fields right after the `stats: [ ... ]` block (around line 25):

```ts
    pitch: {
      en: "a long-running *data dashboard* for GZH, tracking every real spent on rio grande do sul's flood recovery.",
      pt: 'um *painel de dados* de longa duração para a GZH, que acompanha cada real gasto na recuperação das enchentes do rio grande do sul.',
    },
    whatShipped: {
      en: "a static next.js 14 bundle on azion's edge — one 488 KB `data.json` powers 19 routes, three charting libraries, and a leaflet map.",
      pt: 'bundle estático next.js 14 na edge da azion — um `data.json` de 488 KB alimenta 19 rotas, três libs de chart e um mapa leaflet.',
    },
    trick: {
      en: 'a *selector layer* in `src/lib/utils.ts` reduces the flat JSON into per-government, per-segment, and summary shapes — memoized by call site so totals never recompute across re-renders.',
      pt: 'uma *camada de selectors* em `src/lib/utils.ts` reduz o JSON achatado em recortes por esfera, por segmento e de sumário — memoizada por call site, sem recálculo entre re-renders.',
    },
```

**Remove**: the entire `routes: [ ... ]` block (lines 67-87), the entire `screenshots: [ ... ]` block (lines 50-66), and the entire `story: [ ... ]` block (lines 88-126). Leave the trailing `},` of the object intact.

- [ ] **Step 2: Edit `enquetes-gzh`**

Locate the `id: 'enquetes-gzh'` entry (line 129).

**Add** after its `stats: [ ... ]` block:

```ts
    pitch: {
      en: 'two *real-time apps* over one firestore — a newsroom backoffice and a public vote widget that journalists drop into articles.',
      pt: 'dois *apps em tempo real* sobre um firestore — um backoffice para a redação e um widget público que jornalistas inserem em matérias.',
    },
    whatShipped: {
      en: 'react 18 + vite + shadcn/ui. backoffice google-auth locked to `@gruporbs.com.br`; embed loads any poll by `?poll_id=` and streams percentages via `onSnapshot`.',
      pt: 'react 18 + vite + shadcn/ui. backoffice com google-auth restrito a `@gruporbs.com.br`; embed carrega qualquer enquete por `?poll_id=` e transmite percentuais via `onSnapshot`.',
    },
    trick: {
      en: 'duplicate-vote detection uses a `localStorage` device ID as the firestore doc ID — *O(1) check, zero server round-trip* for repeat visitors; vote commits via atomic `increment()`.',
      pt: 'a detecção de voto duplicado usa um device id em `localStorage` como id do documento firestore — *check O(1), sem round-trip* para visitantes recorrentes; o voto entra por `increment()` atômico.',
    },
```

**Remove**: the entire `story: [ ... ]` block. (This project has no `routes` or `screenshots`.)

- [ ] **Step 3: Edit `ia-na-redacao`**

Locate the `id: 'ia-na-redacao'` entry (line 197).

**Add** after the `techStack: [ ... ]` block (this project has no `stats`):

```ts
    pitch: {
      en: 'an *internal grupo rbs hub* where journalists share how they actually use ai — seven video testimonials, four long-form articles, no backend.',
      pt: 'um *hub interno do grupo rbs* onde jornalistas compartilham como usam ia no dia a dia — sete vídeos curtos, quatro artigos longos, sem backend.',
    },
    whatShipped: {
      en: 'a react + vite spa on a private rbs host. one `course-content.json` is the cms; navigation between dashboard, player, and reader runs purely on `useState`.',
      pt: 'spa react + vite em host privado da rbs. um `course-content.json` faz de cms; navegação entre dashboard, player e leitor é pura `useState`.',
    },
    trick: {
      en: '*one shared course shell* — sidebar list + main panel + progress tracker — backs both the video player and the article reader, so completion and sequential navigation work identically across content types.',
      pt: '*um único shell de curso* — sidebar + painel principal + progress tracker — atende o player de vídeo e o leitor de artigo, então progresso e navegação sequencial funcionam igual entre tipos.',
    },
```

**Remove**: `screenshots: [ ... ]` and `story: [ ... ]`.

- [ ] **Step 4: Edit `fotos-do-ano-2025`**

Locate the `id: 'fotos-do-ano-2025'` entry (line 266).

**Add** after its `stats: [ ... ]` block:

```ts
    pitch: {
      en: "GZH's year-end *photo retrospective* — eight staff photographers, eight scroll-driven sections, one fullscreen lightbox.",
      pt: 'a *retrospectiva fotográfica* de fim de ano da GZH — oito fotógrafos do quadro, oito seções guiadas por scroll, um lightbox fullscreen.',
    },
    whatShipped: {
      en: 'a no-backend vite 6 + react 18 spa, deployed under `/especiais/fotos-do-ano-2025/`. all copy inline in `App.tsx`; brightcove iframes own the video lifecycle.',
      pt: 'spa vite 6 + react 18 sem backend, sob `/especiais/fotos-do-ano-2025/`. toda a copy mora em `App.tsx`; iframes do brightcove cuidam do ciclo do vídeo.',
    },
    trick: {
      en: "scroll is driven entirely by *motion's `useScroll` + `useTransform`*, with a `generateSquares` helper laying out parallax thumbnails on stable deterministic positions — every animation stays on `transform` and `opacity`.",
      pt: 'o scroll é guiado por *`useScroll` + `useTransform` do motion*, com `generateSquares` distribuindo thumbnails parallax em posições determinísticas estáveis — toda animação fica em `transform` e `opacity`.',
    },
```

**Remove**: `screenshots: [ ... ]` and `story: [ ... ]`.

- [ ] **Step 5: Edit `peleia-gre-nal`**

Locate the `id: 'peleia-gre-nal'` entry (line 340).

**Add** after its `stats: [ ... ]` block:

```ts
    pitch: {
      en: "a *super trunfo card duel* themed around porto alegre's gre-nal — pick a side, play ten rounds against the house, watch a podium decide it.",
      pt: 'um *duelo de super trunfo* tematizado pelo gre-nal — escolha um lado, jogue dez rodadas contra a casa, e um pódio decide o resultado.',
    },
    whatShipped: {
      en: 'a single-route react + vite + emotion spa. game progression is a client-side state machine; 56 athlete portraits, four stat icons, and bronze/silver/gold medals ship as static assets.',
      pt: 'spa react + vite + emotion de rota única. a progressão é uma state machine no cliente; 56 retratos, quatro ícones de atributo e medalhas bronze/prata/ouro são estáticos.',
    },
    trick: {
      en: 'the *gangorra* swaps between three pre-baked webp illustrations to visualize score momentum, and card reveals run in two sequential phases — opponent card first, then winning-stat highlight — for a TV-style read.',
      pt: 'a *gangorra* alterna entre três webps pré-renderizados para visualizar o momentum, e cada carta vira em duas fases — primeiro a do adversário, depois o destaque no atributo vencedor — leitura estilo TV.',
    },
```

**Remove**: `screenshots: [ ... ]` and `story: [ ... ]`.

- [ ] **Step 6: Edit `hotmart-bunde`**

Locate the `id: 'hotmart-bunde'` entry (line 414).

**Add** after its `stats: [ ... ]` block:

```ts
    pitch: {
      en: 'a *scrapbook landing* for a 50+ hour political-fundamentals course — pure conversion funnel, no auth, no cart, no payment surface.',
      pt: 'uma *landing artesanal* para um curso de 50+ horas de fundamentos políticos — funil puro de conversão, sem auth, sem carrinho, sem pagamento.',
    },
    whatShipped: {
      en: 'a react 18 + vite 6 spa on cloudflare pages, with tailwind v4 expressing the entire scrapbook system as utility classes — paper textures, washi tape, torn edges, layered shadows.',
      pt: 'spa react 18 + vite 6 no cloudflare pages, com tailwind v4 expressando o sistema scrapbook todo como classes utilitárias — texturas de papel, fitas washi, bordas rasgadas e sombras em camadas.',
    },
    trick: {
      en: 'a *`?edit=1` url flag* turns the 17-instructor hero into an in-browser tuning mode, letting per-regime overrides be dragged into place without a redeploy.',
      pt: 'uma *flag `?edit=1` na url* transforma o hero dos 17 professores em modo de ajuste no navegador, permitindo arrastar overrides por regime sem novo deploy.',
    },
```

**Remove**: `screenshots: [ ... ]` and `story: [ ... ]`.

- [ ] **Step 7: Edit `fotos-do-ano-2024`**

Locate the `id: 'fotos-do-ano-2024'` entry (line 490).

**Add** after its `stats: [ ... ]` block:

```ts
    pitch: {
      en: "*zero hora's 2024 photo retrospective* — eight staff photographers, one image each from the may floods, told as a single first-person record.",
      pt: 'a *retrospectiva fotográfica 2024* da zero hora — oito fotógrafos do quadro, uma imagem de cada das enchentes de maio, contada como um único registro em primeira pessoa.',
    },
    whatShipped: {
      en: 'a vite-built react spa under `/especiais/fotos-do-ano-2024/`. each section pairs a featured photo, a first-person caption, an inline `<video>` testimonial, and a black-and-white portrait.',
      pt: 'spa react com vite sob `/especiais/fotos-do-ano-2024/`. cada seção combina foto-destaque, legenda em primeira pessoa, depoimento `<video>` inline e retrato em preto-e-branco.',
    },
    trick: {
      en: 'a *scroll-driven sticky wordmark* tracks position over the hero, repositions to each panel\'s top-right kicker, and switches color from peach to white as dark photo panels slide underneath.',
      pt: 'um *wordmark fixo guiado por scroll* acompanha o hero, reposiciona-se no canto superior direito de cada painel e troca de pêssego para branco quando painéis escuros passam por baixo.',
    },
```

**Remove**: `screenshots: [ ... ]` and `story: [ ... ]`.

- [ ] **Step 8: Verify typecheck, build, and unit tests pass**

Run: `npx tsc -b && npm run build && npm run test:unit`

Expected: all green. The `projects.validator.test.ts` and the module-load-time validator in `projects.ts` (lines 568-579) only check `mockups` — they're unaffected by adding/removing the fields above.

- [ ] **Step 9: Commit**

```bash
git add src/data/projects.ts
git commit -m "feat(projects): migrate 7 highlights to editorial digest data shape"
```

---

## Task 10 — Verification pass

**Files:** none modified

End-to-end visual verification. No code changes unless a defect is found — in which case, open a fresh task or fix inline and amend the relevant earlier commit.

- [ ] **Step 1: Run the full unit test suite**

Run: `npm run test:unit`

Expected: all green.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: build succeeds with no TypeScript errors, no Vite warnings about missing assets.

- [ ] **Step 3: Boot the dev server**

Run: `npm run dev` (in background or separate terminal)

Expected: server listens on `http://localhost:5173`.

- [ ] **Step 4: Manual visual check — desktop viewport (1440px)**

Open each of the 7 highlight pages in a browser at 1440px width:

- http://localhost:5173/projects/painel-da-reconstrucao
- http://localhost:5173/projects/enquetes-gzh
- http://localhost:5173/projects/ia-na-redacao
- http://localhost:5173/projects/fotos-do-ano-2025
- http://localhost:5173/projects/peleia-gre-nal
- http://localhost:5173/projects/hotmart-bunde
- http://localhost:5173/projects/fotos-do-ano-2024

For each page, confirm:
- Hero, ScrollCue, Pitch (display type with italic-blue accent), desktop mockup (≤880px, centered), WhatShippedRow (mobile mockup left ≤360px, prose right), TrickCard (sand bg, trick prose + tech pills), Contact, Footer all render in that order.
- The mobile mockup is visually centered with no off-axis bleed.
- Inline backticks render as `<code>` (sand bg, monospace).
- Inline `*em*` renders blue-italic.

- [ ] **Step 5: Manual visual check — mobile viewport (375px)**

In Chrome DevTools, switch to iPhone SE (375px) and revisit one representative page (e.g. `/projects/hotmart-bunde`).

Confirm:
- `WhatShippedRow` stacks vertically (mockup on top, text below).
- `TrickCard` padding tightens to 24px.
- No horizontal overflow.

- [ ] **Step 6: Manual visual check — reduced motion**

In Chrome DevTools → Rendering tab → "Emulate CSS media feature `prefers-reduced-motion`: reduce". Reload one highlight page.

Confirm:
- No fade-up or scale transforms on Pitch / MockupFrame / WhatShippedRow / TrickCard. Pure opacity transitions only.

- [ ] **Step 7: Lighthouse on `npm run preview`**

Stop the dev server. Run:

```bash
npm run preview
```

Then run Lighthouse against `http://localhost:4173/projects/hotmart-bunde` (Chrome DevTools → Lighthouse → Performance, mobile + desktop).

Expected: Performance ≥95. (Per memory: always Lighthouse against `npm run preview`, not `npm run dev`.)

- [ ] **Step 8: Tick all spec TODOs**

In `docs/superpowers/specs/2026-05-17-project-detail-revamp-design.md`, change each `- [ ]` in the TODO section to `- [x]` for items completed by Tasks 1-9.

- [ ] **Step 9: Final commit (spec ticks only)**

```bash
git add docs/superpowers/specs/2026-05-17-project-detail-revamp-design.md
git commit -m "docs(spec): tick project-detail-revamp TODOs after verification"
```

---

## Self-Review Notes

**Spec coverage:** All 11 spec TODOs are addressed across Tasks 1-9. Pitch (T4), MockupFrame (T5), WhatShippedRow (T6), TrickCard (T7), `ProjectDetail.tsx` rewrite (T8), data migration drops + adds (T9), `Footnotes` invocation removal (covered inside T8's replacement of the legacy block), build + manual checks + Lighthouse (T10).

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate"/etc. Every step has the full code or exact command.

**Type consistency:** `Pitch`, `MockupFrame`, `WhatShippedRow`, `TrickCard` Props names and shapes are consistent between Tasks 4-7 and the wiring in Task 8. `Bilingual` import path is consistent. `parseInline` import path is consistent.

**Animation choice on Pitch:** The spec called for a word-split fade-up like the hero's tagline. After drafting copy, every pitch's italic span is multi-word (`*data dashboard*`, `*real-time apps*`, etc.), which would collapse to literal asterisks under per-word `parseInline`. Task 4 uses a single fade-up instead — simpler, keeps the multi-word italic-blue accents intact, and the display type carries the entrance weight on its own.
