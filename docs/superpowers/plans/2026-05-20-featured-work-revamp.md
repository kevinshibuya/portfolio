# Featured Work revamp — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. After each step's command lands successfully, edit the corresponding `- [ ]` to `- [x]` in this file before proceeding.

**Goal:** Replace the bento-grid `Projects` section with a sticky-left + scrolling-right editorial layout: square parallax cards on the right, dynamic per-active-project content on the left (desktop), static intro fallback (mobile), and a custom "view project" cursor follower that rotates against horizontal mouse velocity.

**Architecture:** Single rewrite of `src/components/sections/Projects.tsx`. The component owns three concerns colocated in one file: (1) the `<Projects>` section with grid + sticky aside + project list, (2) the per-row `<ProjectRow>` with framer-motion scroll parallax + image-only hover scale, (3) the `<CursorFollower>` with springed motion values + velocity-derived rotation. Active project is tracked via per-row `IntersectionObserver` registered in a parent `useEffect`. Sandbox files (route, page, CSS) are deleted as part of this plan so the branch lands clean.

**Tech Stack:** React 19, TypeScript (strict), Framer Motion v12 (`useMotionValue`, `useSpring`, `useScroll`, `useTransform`, `useVelocity`), react-i18next, plain CSS in `src/index.css` (no Tailwind utilities for section styles — matches existing pattern).

**Spec:** [`docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md`](../specs/2026-05-20-featured-work-revamp-design.md)

---

## File structure

**Create:** none. All new code lives in the rewritten `Projects.tsx` and appended rules in `index.css`.

**Modify:**
- `src/components/sections/Projects.tsx` — full rewrite
- `src/index.css` — append `.project-aside*`, `.project-row*`, `.project-cursor*` rules (do NOT touch `.bento*` rules)
- `src/i18n/locales/en.json` — add `sections.projects.intro`
- `src/i18n/locales/pt.json` — add `sections.projects.intro`
- `src/App.tsx` — remove `SandboxFeaturedWork` lazy import and `/sandbox/featured-work` route

**Delete:**
- `src/pages/SandboxFeaturedWork.tsx`
- `src/styles/sandbox-featured-work.css`
- `src/styles/` directory if it ends up empty

**Verify-only (must NOT regress):**
- `src/index.css` body rule keeps `overflow-x: clip` (NOT `hidden`) — required for sticky to engage
- `.bento*` rules in `src/index.css` remain untouched
- `src/hooks/useCursorTilt.ts` stays in the repo (other future callers may want it)

---

### Task 1: Add i18n key for the static mobile intro

**Files:**
- Modify: `src/i18n/locales/en.json`
- Modify: `src/i18n/locales/pt.json`

- [x] **Step 1: Read the current `sections.projects` block in both locale files**

Run: `grep -A 6 '"projects"' src/i18n/locales/en.json src/i18n/locales/pt.json`

Expected: each file has a `sections.projects` object with `index`, `label`, `title`, `description`, `caseStudy` keys.

- [x] **Step 2: Add `intro` to `src/i18n/locales/en.json`**

Find the `"caseStudy"` line inside `sections.projects` and add an `intro` key after it. The updated block should read exactly:

```json
    "projects": {
      "index": "01 · featured",
      "label": "",
      "title": "selected <em>work.</em>",
      "description": "personal highlights. from brief to ship.",
      "caseStudy": "case study",
      "intro": "a handful of recent projects i'm proudest of — newsroom tools, scroll-driven specials, and interactive embeds that reached millions of brazilian readers.",
      "viewProject": "view project"
    },
```

- [x] **Step 3: Add the matching PT keys to `src/i18n/locales/pt.json`**

```json
      "intro": "uma seleção dos projetos que mais me orgulho — ferramentas de redação, especiais comandados pelo scroll e embeds interativos que alcançaram milhões de leitores brasileiros.",
      "viewProject": "ver projeto"
```

(Both lines go after `caseStudy` in the same `sections.projects` block. Note the comma after `caseStudy` line is now required since `intro`/`viewProject` are no longer the last keys.)

Insert it after the existing `caseStudy` line in the same `sections.projects` block.

- [x] **Step 4: Verify both files still parse as valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('src/i18n/locales/en.json','utf8')); JSON.parse(require('fs').readFileSync('src/i18n/locales/pt.json','utf8')); console.log('ok')"`

Expected: `ok` (no parse errors).

- [x] **Step 5: Tick the corresponding TODO in the spec**

Edit `docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md` and change the `- [ ]` for "New i18n keys: `sections.projects.intro` (static mobile paragraph) …" to `- [x]`. Also tick "Cursor pill: small monospace 'view project' …" — the `viewProject` key satisfies the copy half of that TODO (positioning is verified in Task 7).

---

### Task 2: Verify `body { overflow-x: clip }` is in place

**Files:**
- Verify: `src/index.css`

- [x] **Step 1: Confirm the rule reads `overflow-x: clip` (not `hidden`)**

Run: `grep -A 2 -B 0 'overflow-x:' src/index.css | head -10`

Expected: a single match `overflow-x: clip;` inside the `html, body` rule (~line 91). If you see `overflow-x: hidden`, change it to `clip`:

```css
  /* `clip` (not `hidden`) so sticky descendants don't inherit body as a
     containing-block and lose their stick. `clip` still suppresses any
     horizontal overflow from off-screen animations. */
  overflow-x: clip;
```

(This change was already shipped on the branch during the sandbox phase — this step exists to guard against a stray revert.)

---

### Task 3: Rewrite `Projects.tsx` shell — grid + static mobile aside

In this task we get the component to a working "renders 4 square cards with no parallax, sticky aside shows static intro on all viewports, links navigate" state. Parallax, active-tracking, hover scale, and the cursor follower come in later tasks. This gives us a working baseline to compare against.

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [x] **Step 1: Replace `src/components/sections/Projects.tsx` with the shell version**

Write the entire file contents (overwrite, do not patch):

```tsx
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { projects } from '../../data/projects'
import type { Project } from '../../types/content'

const FEATURED_LIMIT = 4

function getFeatured(): Project[] {
  return projects
    .filter((p) => p.highlight && (p.highlightOrder ?? 99) <= FEATURED_LIMIT)
    .sort((a, b) => (a.highlightOrder ?? 99) - (b.highlightOrder ?? 99))
}

export function Projects() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const featured = getFeatured()

  return (
    <section id="projects" className="section project-section">
      <div className="project-grid">
        <aside className="project-aside">
          <div className="project-aside__mobile">
            <span className="project-aside__eyebrow">{t('sections.projects.index')}</span>
            <h2 className="project-aside__title-static">
              <Trans i18nKey="sections.projects.title" components={{ em: <em /> }} />
            </h2>
            <p className="project-aside__copy">{t('sections.projects.intro')}</p>
            <span className="project-aside__year">
              {String(featured.length).padStart(2, '0')} · projects
            </span>
          </div>
        </aside>

        <div className="project-list">
          {featured.map((project, idx) => (
            <ProjectRow key={project.id} project={project} index={idx} lang={lang} />
          ))}
        </div>
      </div>
    </section>
  )
}

interface ProjectRowProps {
  project: Project
  index: number
  lang: 'en' | 'pt'
}

function ProjectRow({ project, index, lang }: ProjectRowProps) {
  return (
    <Link to={`/projects/${project.slug}`} className="project-row">
      <div className="project-row__media" style={{ background: project.gradient }}>
        <span className="project-row__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="project-row__img"
            width="1200"
            height="1200"
          />
        )}
      </div>
      <div className="project-row__meta">
        <h3 className="project-row__title">{project.title[lang]}</h3>
        <span className="project-row__tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}

export default Projects
```

Notes for the implementer:
- This shell intentionally omits framer-motion, IntersectionObserver, the desktop dynamic aside, and the cursor follower. Those are added in Tasks 4, 5, 6, 7.
- The mobile "projects" suffix is plain string for now. If the design team later wants it translated, add a new i18n key — don't reuse `sections.projects.label` (that's used for the section's optional sub-label in `SectionHeading` and is currently `""`).

- [x] **Step 2: Append the shell CSS to `src/index.css`**

Find the closing `}` of the `.bento*` block in `src/index.css` (search for `.bento-mockup--mobile` and find the next `}`). Append, with one blank line of separation:

```css
/* =========================================================================
   FEATURED WORK — sticky aside + scrolling square cards
   ========================================================================= */
.project-section { /* no-op — `.section` already sets max-width, padding, etc. */ }

.project-grid {
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 80px;
  align-items: start;
}

.project-aside {
  position: sticky;
  top: 120px;
  padding-top: 8px;
}
/* Mobile-static block (shown by default; the desktop dynamic block — added
   in Task 5 — overrides via media query). */
.project-aside__mobile {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.project-aside__eyebrow {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--blue-400);
}
.project-aside__title-static {
  font-size: clamp(48px, 7vw, 96px);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.025em;
  color: var(--ink);
  margin: 0;
}
.project-aside__title-static em {
  color: var(--blue-400);
  font-style: italic;
}
.project-aside__copy {
  font-size: 16px;
  line-height: 1.6;
  color: var(--bark);
  max-width: 38ch;
  margin: 0;
}
.project-aside__year {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--dust);
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 120px;
}

.project-row {
  display: block;
  text-decoration: none;
  color: inherit;
}

.project-row__media {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--mist);
}
.project-row__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 124%;
  top: -12%;
  object-fit: cover;
  will-change: transform;
  transform-origin: center center;
}
.project-row__idx {
  position: absolute;
  top: 18px;
  left: 22px;
  z-index: 2;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
  letter-spacing: 0.06em;
  color: var(--ink);
  background: color-mix(in srgb, var(--cream) 80%, transparent);
  backdrop-filter: blur(6px);
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--ink) 10%, transparent);
}

.project-row__meta {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 24px;
  padding: 20px 4px 0;
  border-top: 1px solid var(--mist);
  margin-top: 20px;
}
.project-row__title {
  margin: 0;
  font-size: clamp(22px, 2.4vw, 32px);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.01em;
  color: var(--ink);
}
.project-row__tags {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--bark);
  text-align: right;
  max-width: 50%;
}

/* Cursor follower rules are appended in Task 7. */
/* Desktop dynamic-aside rules are appended in Task 5. */
/* Mobile responsive rules are appended in Task 8. */
```

- [x] **Step 3: Build to verify no TS / CSS errors**

Run: `npm run build`
Expected: builds successfully; the existing HeroAccent3D chunk-size advisory is the only warning.

- [x] **Step 4: Manual visual check at 1440px**

Start dev server: `npm run dev`
Open `http://localhost:5173/` and scroll to the Projects section. Expected:
- 4 square cards stacked vertically on the right with images visible
- Sticky aside on the left shows `01 · featured` + `selected work.` heading + intro paragraph + `04 · projects`
- Aside stays pinned as you scroll past the cards
- No console errors

Stop the dev server before continuing.

- [x] **Step 5: Tick the corresponding TODO in the spec**

In `docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md`, tick the box for "`src/components/sections/Projects.tsx` rewritten: sticky aside (desktop) + scrolling list of square project rows; bento removed from this file" → `- [x]`. Also tick "Project rows show the top 4 highlights …" and "Project row: square image frame …". Active-tracking and parallax stay unticked — those land in later tasks.

---

### Task 4: Add per-row parallax via `useScroll`

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [x] **Step 1: Add framer-motion imports**

At the top of `src/components/sections/Projects.tsx`, change the existing imports so the file starts with:

```tsx
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { projects } from '../../data/projects'
import type { Project } from '../../types/content'
```

- [x] **Step 2: Rewrite `ProjectRow` to add the parallax**

Replace the whole `ProjectRow` function with:

```tsx
function ProjectRow({ project, index, lang }: ProjectRowProps) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])

  return (
    <Link to={`/projects/${project.slug}`} className="project-row">
      <div ref={mediaRef} className="project-row__media" style={{ background: project.gradient }}>
        <span className="project-row__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <motion.img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="project-row__img"
            style={{ y: imgY }}
            width="1200"
            height="1200"
          />
        )}
      </div>
      <div className="project-row__meta">
        <h3 className="project-row__title">{project.title[lang]}</h3>
        <span className="project-row__tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}
```

- [x] **Step 3: Build to verify**

Run: `npm run build`
Expected: clean build.

- [x] **Step 4: Manual scroll check**

Run `npm run dev`, scroll through the Projects section, and confirm the image *inside* each square frame visibly drifts vertically as the card crosses the viewport (top of card on screen → image translated up; bottom on screen → image translated down). The frame itself does not move.

Stop the dev server before continuing.

- [x] **Step 5: Tick the parallax TODO in the spec**

Tick "Parallax on each row's image: `framer-motion useScroll` …" → `- [x]`.

- [x] **Step 6: Commit progress (single commit covers Tasks 1–4)**

```bash
git add src/components/sections/Projects.tsx src/index.css src/i18n/locales/en.json src/i18n/locales/pt.json docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md
git commit -m "feat(projects): square card layout + parallax — replaces bento"
```

---

### Task 5: Active-project tracking + desktop dynamic aside

**Files:**
- Modify: `src/components/sections/Projects.tsx`
- Modify: `src/index.css` (append desktop-aside CSS)

- [ ] **Step 1: Add the active-state hook + render the desktop aside**

Replace the `Projects` function with:

```tsx
export function Projects() {
  const { t, i18n } = useTranslation()
  const lang = i18n.language.startsWith('pt') ? 'pt' : 'en'
  const featured = getFeatured()
  const [active, setActive] = useState(0)
  const mediaRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    mediaRefs.current.forEach((node, idx) => {
      if (!node) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActive(idx)
        },
        { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
      )
      obs.observe(node)
      observers.push(obs)
    })
    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const current = featured[active]

  return (
    <section id="projects" className="section project-section">
      <div className="project-grid">
        <aside className="project-aside">
          {/* Mobile-static block (Task 3) */}
          <div className="project-aside__mobile">
            <span className="project-aside__eyebrow">{t('sections.projects.index')}</span>
            <h2 className="project-aside__title-static">
              <Trans i18nKey="sections.projects.title" components={{ em: <em /> }} />
            </h2>
            <p className="project-aside__copy">{t('sections.projects.intro')}</p>
            <span className="project-aside__year">
              {String(featured.length).padStart(2, '0')} · projects
            </span>
          </div>

          {/* Desktop-dynamic block — swaps per active project */}
          <div className="project-aside__desktop">
            <span className="project-aside__eyebrow">{t('sections.projects.index')}</span>

            <div className="project-aside__index">
              <span className="project-aside__index-now">{String(active + 1).padStart(2, '0')}</span>
              <span className="project-aside__index-sep">/</span>
              <span className="project-aside__index-total">
                {String(featured.length).padStart(2, '0')}
              </span>
            </div>

            <motion.h2
              key={current.id + '-t'}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="project-aside__title"
            >
              {current.title[lang]}
            </motion.h2>

            {current.tagline && (
              <motion.p
                key={current.id + '-tg'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                className="project-aside__tagline"
              >
                {current.tagline[lang]}
              </motion.p>
            )}

            <motion.p
              key={current.id + '-d'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="project-aside__copy"
            >
              {current.description[lang]}
            </motion.p>

            <motion.ul
              key={current.id + '-tech'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="project-aside__tech"
            >
              {current.techStack.slice(0, 6).map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </motion.ul>

            <div className="project-aside__bottom">
              <span className="project-aside__year">year · {current.year}</span>
              <Link to={`/projects/${current.slug}`} className="project-aside__cta">
                ↗ {t('sections.projects.caseStudy')}
              </Link>
            </div>
          </div>
        </aside>

        <div className="project-list">
          {featured.map((project, idx) => (
            <ProjectRow
              key={project.id}
              project={project}
              index={idx}
              lang={lang}
              mediaRefCb={(el) => {
                mediaRefs.current[idx] = el
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Add `useState` and `useEffect` to the imports**

The `react` import line should now be:

```tsx
import { useEffect, useRef, useState } from 'react'
```

- [ ] **Step 3: Update `ProjectRow` to accept and wire the `mediaRefCb`**

Replace the `ProjectRowProps` interface and the `ProjectRow` function with:

```tsx
interface ProjectRowProps {
  project: Project
  index: number
  lang: 'en' | 'pt'
  mediaRefCb: (el: HTMLDivElement | null) => void
}

function ProjectRow({ project, index, lang, mediaRefCb }: ProjectRowProps) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])

  function setRef(el: HTMLDivElement | null) {
    mediaRef.current = el
    mediaRefCb(el)
  }

  return (
    <Link to={`/projects/${project.slug}`} className="project-row">
      <div ref={setRef} className="project-row__media" style={{ background: project.gradient }}>
        <span className="project-row__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <motion.img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="project-row__img"
            style={{ y: imgY }}
            width="1200"
            height="1200"
          />
        )}
      </div>
      <div className="project-row__meta">
        <h3 className="project-row__title">{project.title[lang]}</h3>
        <span className="project-row__tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 4: Append desktop-aside CSS to `src/index.css`**

Find the `Cursor follower rules are appended in Task 7.` comment placeholder and replace it with:

```css
/* Desktop-dynamic aside — hidden by default; revealed in the desktop media
   query at the bottom of this block. */
.project-aside__desktop {
  display: none;
  flex-direction: column;
  gap: 20px;
  min-height: 540px;
}
.project-aside__index {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
.project-aside__index-now {
  font-size: 64px;
  line-height: 1;
  color: var(--ink);
  font-weight: 300;
  letter-spacing: -0.02em;
}
.project-aside__index-sep { color: var(--mist); font-size: 28px; }
.project-aside__index-total { color: var(--dust); font-size: 18px; }
.project-aside__title {
  font-size: clamp(36px, 4.6vw, 60px);
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.025em;
  color: var(--ink);
  margin: 0;
}
.project-aside__tagline {
  font-size: 17px;
  color: var(--blue-400);
  font-style: italic;
  line-height: 1.4;
  margin: 0;
}
.project-aside__tech {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.project-aside__tech li {
  padding: 4px 10px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  font-size: 12px;
  color: var(--bark);
}
.project-aside__bottom {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 16px;
  margin-top: auto;
  padding-top: 20px;
  border-top: 1px solid var(--mist);
}
.project-aside__cta {
  font-size: 14px;
  color: var(--blue-500);
  font-weight: 500;
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.3s ease;
}
.project-aside__cta:hover { border-color: var(--blue-500); }

/* Show the desktop block / hide the mobile block above 900px. */
@media (min-width: 901px) {
  .project-aside__mobile { display: none; }
  .project-aside__desktop { display: flex; }
}
```

- [ ] **Step 5: Build to verify**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 6: Manual scroll check**

`npm run dev`, open home, scroll Projects:
- At top of section, aside shows project 1 (política essencial — counter `01 / 04`, title, italic tagline in blue, description, tech pills, year, `↗ case study`)
- Scroll until card 2 (chat da hora? confirm against `getFeatured()`) reaches viewport center — aside content swaps with a crossfade
- All 4 transitions feel smooth; no layout shift
- Mobile static block is `display: none` at this viewport

Stop the dev server.

- [ ] **Step 7: Tick the spec TODOs**

Tick: "Sticky aside (desktop) reflects the **active project**", "Active project is detected via `IntersectionObserver`", "Active-content transitions: each text block keys off `project.id`".

- [ ] **Step 8: Commit**

```bash
git add src/components/sections/Projects.tsx src/index.css docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md
git commit -m "feat(projects): per-active dynamic aside on desktop"
```

---

### Task 6: Image-only hover scale

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [ ] **Step 1: Add hover state to `ProjectRow`**

Replace the `ProjectRow` function with the version that adds the `hover` state and `animate.scale` on the `<motion.img>`:

```tsx
function ProjectRow({ project, index, lang, mediaRefCb }: ProjectRowProps) {
  const mediaRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: mediaRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['-12%', '12%'])
  const [hover, setHover] = useState(false)

  function setRef(el: HTMLDivElement | null) {
    mediaRef.current = el
    mediaRefCb(el)
  }

  return (
    <Link to={`/projects/${project.slug}`} className="project-row">
      <div
        ref={setRef}
        className="project-row__media"
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        style={{ background: project.gradient }}
      >
        <span className="project-row__idx">{String(index + 1).padStart(2, '0')}</span>
        {project.mockups && (
          <motion.img
            src={project.mockups.desktopBento}
            alt=""
            loading="lazy"
            decoding="async"
            className="project-row__img"
            style={{ y: imgY }}
            animate={{ scale: hover ? 1.06 : 1 }}
            transition={{ scale: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }}
            width="1200"
            height="1200"
          />
        )}
      </div>
      <div className="project-row__meta">
        <h3 className="project-row__title">{project.title[lang]}</h3>
        <span className="project-row__tags">
          [ {project.techStack.slice(0, 3).join(' ] — [ ')} ]
        </span>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Manual hover check**

`npm run dev`, hover each card. Expected:
- Image visibly scales up to ~1.06× over ~700ms
- Frame box does not change size
- `01` badge stays where it is
- Meta-row title and tags below the frame do not move

Stop the dev server.

- [ ] **Step 4: Tick the spec TODO**

Tick: "Image hover scale: `1.06` via framer-motion `animate.scale` …"

- [ ] **Step 5: Commit**

```bash
git add src/components/sections/Projects.tsx
git commit -m "feat(projects): image-only hover scale inside fixed frame"
```

---

### Task 7: Custom cursor follower (`<CursorFollower>`)

**Files:**
- Modify: `src/components/sections/Projects.tsx`
- Modify: `src/index.css` (append cursor-follower rules)

- [ ] **Step 1: Add velocity-related imports to `Projects.tsx`**

The top imports block should now be:

```tsx
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { projects } from '../../data/projects'
import type { Project } from '../../types/content'
```

- [ ] **Step 2: Add cursor state + `onMouseMove` handler to `Projects`**

In the `Projects` component body, after the existing `useState`/`useRef`/`useEffect`, add:

```tsx
  const cursorX = useMotionValue(-100)
  const cursorY = useMotionValue(-100)
  const springX = useSpring(cursorX, { damping: 28, stiffness: 380, mass: 0.4 })
  const springY = useSpring(cursorY, { damping: 28, stiffness: 380, mass: 0.4 })
  const vx = useVelocity(springX)
  const rotate = useTransform(vx, [-2500, 2500], [18, -18], { clamp: true })
  const [hovering, setHovering] = useState(false)

  function handleMove(e: React.MouseEvent) {
    cursorX.set(e.clientX)
    cursorY.set(e.clientY)
  }
```

- [ ] **Step 3: Add `onMouseMove` to the section root and pass hover toggles into rows**

Change the section element to:

```tsx
    <section
      id="projects"
      className="section project-section"
      onMouseMove={handleMove}
    >
```

And update the `ProjectRow` call site in `Projects` to pass the hover toggles:

```tsx
<ProjectRow
  key={project.id}
  project={project}
  index={idx}
  lang={lang}
  mediaRefCb={(el) => {
    mediaRefs.current[idx] = el
  }}
  onHoverEnter={() => setHovering(true)}
  onHoverLeave={() => setHovering(false)}
/>
```

- [ ] **Step 4: Update `ProjectRowProps` and wire the new callbacks**

```tsx
interface ProjectRowProps {
  project: Project
  index: number
  lang: 'en' | 'pt'
  mediaRefCb: (el: HTMLDivElement | null) => void
  onHoverEnter: () => void
  onHoverLeave: () => void
}
```

And inside `ProjectRow`, change the pointer handlers to call both the local + parent toggles:

```tsx
        onPointerEnter={() => {
          setHover(true)
          onHoverEnter()
        }}
        onPointerLeave={() => {
          setHover(false)
          onHoverLeave()
        }}
```

(Add `onHoverEnter` and `onHoverLeave` to the destructured props.)

- [ ] **Step 5: Add the cursor-follower JSX at the end of the `<section>`**

Just before the closing `</section>` (after the `.project-grid` div), add:

```tsx
        <motion.div
          className="project-cursor"
          style={{ x: springX, y: springY }}
          aria-hidden="true"
        >
          <motion.div
            className="project-cursor__rotor"
            style={{ rotate }}
            animate={hovering ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="project-cursor__pill">{t('sections.projects.viewProject')}</span>
          </motion.div>
        </motion.div>
```

The `viewProject` key was added to both locale files in Task 1.

- [ ] **Step 6: Append cursor CSS to `src/index.css`**

Insert before the `/* Show the desktop block / hide the mobile block above 900px. */` rule from Task 5:

```css
.project-cursor {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 60;
  pointer-events: none;
}
.project-cursor__rotor {
  position: relative;
  width: 0;
  height: 0;
  transform-origin: 0% 0%;
}
.project-cursor__pill {
  position: absolute;
  left: 0;
  top: 0;
  /* Center horizontally on cursor X; float 14px above cursor Y. */
  transform: translate(-50%, calc(-100% - 14px));
  display: inline-block;
  white-space: nowrap;
  background: var(--blue-400);
  color: var(--cream);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 8px 14px;
  border-radius: 6px;
  box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--blue-500) 60%, transparent);
}
```

- [ ] **Step 7: Build to verify**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 8: Manual hover-and-whip check**

`npm run dev`, hover each card and whip the mouse left/right. Expected:
- System cursor stays visible (no `cursor: none`)
- A small blue pill labelled `case study` appears centered horizontally on the cursor, 14px above
- The pill rotates against the direction of horizontal motion, leaning back as you whip; it springs back to upright when the mouse stops
- The pill scales to 0 and fades out when the mouse leaves the image
- All 4 cards trigger the same behavior

Stop the dev server.

- [ ] **Step 9: Tick the spec TODOs**

Tick: "Custom cursor follower …", "Pill visibility …", "`aria-hidden='true'` on the cursor follower …" (the pill-copy TODO was already ticked in Task 1 Step 5).

- [ ] **Step 10: Commit**

```bash
git add src/components/sections/Projects.tsx src/index.css docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md
git commit -m "feat(projects): velocity-rotated cursor pill on image hover"
```

---

### Task 8: Mobile responsive + reduced-motion + touch fallbacks

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Append responsive + a11y rules to the Featured Work block in `src/index.css`**

After the desktop media-query rule from Task 5, append:

```css
/* Mobile: aside un-sticks; tighter gaps; hide the cursor follower. */
@media (max-width: 900px) {
  .project-grid {
    grid-template-columns: 1fr;
    gap: 48px;
  }
  .project-aside {
    position: relative;
    top: auto;
  }
  .project-list { gap: 80px; }
  .project-cursor { display: none; }
}

/* Touch: cursor follower can't be hovered usefully. */
@media (hover: none) {
  .project-cursor { display: none; }
}

/* Reduced motion: kill parallax + cursor + image hover scale. */
@media (prefers-reduced-motion: reduce) {
  .project-row__img { transform: none !important; }
  .project-cursor { display: none; }
}
```

- [ ] **Step 2: Build to verify**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Manual responsive check**

`npm run dev`. With browser devtools, set viewport to 390×844. Expected:
- Layout collapses to a single column
- Aside renders the **static** block at the top (eyebrow → `selected work.` heading → intro paragraph → `04 · projects`)
- Below the aside, 4 square cards stacked vertically with `80px` gap
- Tap a card → navigates to `/projects/:slug`
- No cursor follower visible

Toggle Chrome's "Emulate CSS prefers-reduced-motion: reduce". Expected on desktop:
- Parallax disabled (image stays centered in frame as you scroll)
- Hover image scale does not animate (immediate or no scale)
- Cursor follower hidden entirely

Stop the dev server.

- [ ] **Step 4: Tick the spec TODOs**

Tick: "Mobile aside (`≤900px`)", "Reduced motion: …", "Touch (`@media (hover: none)`) …"

- [ ] **Step 5: Commit**

```bash
git add src/index.css docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md
git commit -m "feat(projects): mobile, touch, and reduced-motion fallbacks"
```

---

### Task 9: Remove the `useCursorTilt` import

**Files:**
- Modify: `src/components/sections/Projects.tsx`

- [ ] **Step 1: Confirm `useCursorTilt` is no longer referenced in the file**

Run: `grep -n "useCursorTilt" src/components/sections/Projects.tsx`
Expected: no matches (the original bento `BentoCard` used it; the rewrite does not).

If the grep is empty, there's nothing to do for the import either — the import was removed when you overwrote the file in Task 3. Skip to Step 3.

If the grep finds something, that's a regression — go fix `Projects.tsx` so the rewrite doesn't reintroduce the import or call.

- [ ] **Step 2: Confirm the hook file itself stays**

Run: `ls src/hooks/useCursorTilt.ts`
Expected: file exists. (Per spec: don't delete the hook even though Projects.tsx no longer uses it.)

- [ ] **Step 3: Tick the spec TODO**

Tick: "`useCursorTilt` import in `Projects.tsx` removed …"

---

### Task 10: Delete sandbox files + route

**Files:**
- Delete: `src/pages/SandboxFeaturedWork.tsx`
- Delete: `src/styles/sandbox-featured-work.css`
- Delete: `src/styles/` (only if empty after the CSS delete)
- Modify: `src/App.tsx`

- [ ] **Step 1: Delete the sandbox files**

```bash
rm src/pages/SandboxFeaturedWork.tsx
rm src/styles/sandbox-featured-work.css
```

- [ ] **Step 2: Remove the empty `src/styles/` directory if it has no other files**

```bash
ls src/styles/ 2>/dev/null
```

If the output is empty (no files listed):

```bash
rmdir src/styles
```

If `src/styles/` still has other files, leave the directory.

- [ ] **Step 3: Remove the sandbox lazy import + route from `src/App.tsx`**

Open `src/App.tsx`. Delete the `SandboxFeaturedWork` lazy declaration:

```tsx
const SandboxFeaturedWork = lazy(() =>
  import('./pages/SandboxFeaturedWork').then((m) => ({ default: m.SandboxFeaturedWork }))
)
```

And delete the corresponding `<Route>` block:

```tsx
        <Route
          path="/sandbox/featured-work"
          element={
            <Suspense fallback={null}>
              <SandboxFeaturedWork />
            </Suspense>
          }
        />
```

The final `App.tsx` should match `main`'s `App.tsx` shape: `Header` + `Routes` with `/` and `/projects/:slug` only.

- [ ] **Step 4: Build to verify nothing else referenced them**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 5: Verify the route is gone**

Run: `grep -rn "sandbox" src/ 2>/dev/null`
Expected: no matches (other than any unrelated test fixtures).

- [ ] **Step 6: Tick the spec TODO**

Tick: "All sandbox files removed before merge: …"

- [ ] **Step 7: Commit**

```bash
git add -A src/pages src/styles src/App.tsx docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md
git commit -m "chore(projects): drop /sandbox/featured-work prototype route"
```

---

### Task 11: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: TypeScript strict passes, Vite build succeeds, only the pre-existing HeroAccent3D chunk-size advisory warning remains.

- [ ] **Step 2: Test suite**

Run: `npm run test`
Expected: all unit + e2e tests pass green. If any test references the old bento layout or hovered into the cursor follower in unexpected ways, fix the test (the bento implementation no longer exists) — but only if the test was specifically asserting bento behavior on the home page. Do not stub out broader sections in passing.

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Visual sweep at 1440px (desktop)**

`npm run dev`:
- Scroll Projects from top to bottom; aside swaps content for each of the 4 cards in turn
- Parallax visibly drifts image inside each frame as it crosses the viewport
- Hover any image → image scales up, frame and badge stay put, pill appears centered above the cursor
- Whip the mouse left/right while hovering → pill rotates against the direction of motion, returns to upright when settled
- Click `↗ case study` on the desktop aside → navigates to `/projects/:slug` for the active project
- Click any card image → navigates to that project

- [ ] **Step 5: Visual sweep at 390px (mobile)**

In devtools at 390×844:
- Single column, static aside on top with `selected work.` heading + intro paragraph + `04 · projects`
- 4 square cards below, tappable, no cursor pill
- Reduced-motion + touch fallbacks both verified (no parallax-related layout shifts on iPhone simulation)

- [ ] **Step 6: Confirm `body { overflow-x: clip }` survived**

Run: `grep -n "overflow-x" src/index.css | head -5`
Expected: at least one match for `overflow-x: clip` inside the `html, body` rule.

- [ ] **Step 7: Confirm bento CSS is still in place (deferred cleanup)**

Run: `grep -c "bento-card" src/index.css`
Expected: a non-zero number (the bento rules remain — cleanup is a follow-up PR).

- [ ] **Step 8: Tick the final spec TODOs**

Tick the remaining spec TODOs:
- "`npm run build` passes"
- "`npm run test` passes"
- "Visual sweep at 1440px (desktop) …"
- "Visual sweep at 390px (mobile) …"

Verify every `- [ ]` in the spec is now `- [x]`. If any remains unchecked, either tick it (if implementation already satisfies it) or open a follow-up task in this plan and revise.

- [ ] **Step 9: Final commit (no code changes)**

If any spec TODOs were ticked in Step 8 without a commit, commit them now:

```bash
git add docs/superpowers/specs/2026-05-20-featured-work-revamp-design.md
git commit -m "docs(projects): tick spec TODOs satisfied by implementation"
```

If no doc changes are outstanding, skip.

- [ ] **Step 10: Hand off**

The branch `feat/featured-work-good-fella-test` is now ready for review. Hand back to the controller / user with a one-paragraph summary of what changed and a pointer to this plan + the spec.

---

## Self-review notes (post-write)

- Spec coverage: every spec TODO maps to one or more plan steps; the verify-only spec items (overflow-x: clip preserved, bento CSS untouched) have explicit grep checks in Task 11.
- Type consistency: `ProjectRowProps` evolves across Tasks 3 → 5 → 7. Each task fully rewrites the interface to its current shape so there's no "what does it look like by Task 7" ambiguity.
- I18n keys: `sections.projects.intro` (mobile static paragraph) and `sections.projects.viewProject` (cursor pill copy) are both added in Task 1, in both EN and PT.
- Bento CSS is preserved per user decision (Task 11 step 7 grep guard).
