# CV → Portfolio normalization (2026-06-15)

## Goal

Propagate the freshly-rebuilt CV (`~/keki/cv-rebuild/`) into the portfolio: swap the
downloadable PDFs, sync personal facts to the CV as the source of truth, adopt the CV's
new 6-group skills taxonomy, and strip spaced em-dashes (`" — "`) from all reader-facing
prose across the site.

## Source of truth

- CV content: `~/keki/cv-rebuild/cv.html` (EN) + `cv-pt.html` (PT), rendered to
  `cv-en-updated.pdf` / `cv-pt-updated.pdf`.
- Canonical title: **Senior Front-End Engineer · React / TypeScript** (already matched in
  portfolio hero cycle + index.html — do not re-litigate).

## Decisions (locked this session)

1. **Skills** → adopt the CV's **6 groups** (frontend / design / backend & cloud /
   devops & testing / ai engineering / leadership).
2. **Flow Autobody** title → match CV: **"Frontend Developer"** (drop "& Tech Lead").
3. **Em-dashes** → strip spaced `" — "` from **all reader-facing prose** (extended sweep).

## Em-dash sweep — scope rules

- **STRIP** (visible prose): `projects.ts` descriptions + detail copy, `workExperience`
  bullets + highlights, i18n copy (footer, skills desc, stats receipt, eyebrow),
  `index.html` visible meta/JSON-LD, `ProjectDetail` document title.
- **KEEP**: code comments + HTML comments (not reader-facing), date-range periods
  (`Nov 2023 — Present`), acronym labels, and the empty-value `'—'` UI placeholder
  (ArchiveDropdown / Archive).
- **Replacement conventions**: separator dashes → middle dot `·` (footer, page title,
  eyebrow); in-sentence prose → comma / colon / period / parens as fits; preserve
  `*emphasis*` and `` `code` `` markers in detail prose.

## TODO

### CVs
- [x] Copy `cv-en-updated.pdf` → `public/cv-en.pdf`, `cv-pt-updated.pdf` → `public/cv-pt.pdf`
- [x] Verify swapped PDF page 1 shows "Senior Front-End Engineer"

### Skills → 6 groups
- [x] Rewrite `src/data/skills.ts` to the 6 CV groups (items verbatim from CV)
- [x] Update `categoryKeys` map in `src/components/sections/Skills.tsx`
- [x] Add 6 group labels to `en.json` + `pt.json` (`sections.skills.*`)
- [x] Confirm `.skills-grid` flows to 3-col × 2-row (visual) — verified via screenshot

### Work experience facts
- [x] RBS poll bullet: drop "Next.js" claim, name "Enquetes GZH", keep Firebase (EN+PT)
- [x] Flow Autobody role → "Frontend Developer" / "Desenvolvedor Frontend"
- [x] Idéia 2001: location → "São Caetano do Sul, BR"; "Ideia" → "Idéia"

### Em-dash sweep
- [x] `workExperience.ts` prose (RBS newsroom bullet, RBS highlight, Idéia bullet — EN+PT)
- [x] `projects.ts` all visible description + detail prose (EN+PT) — only the literal
      `'ZEROHORA — fotos do ano 2024'` wordmark quote kept (faithful to on-screen text)
- [x] `en.json` + `pt.json` (footer, skills desc, stats receipt, eyebrow)
- [x] `index.html` visible meta/og/twitter/JSON-LD + title separators (comments kept)
- [x] `ProjectDetail.tsx` document title separator

### Verification
- [x] `npx tsc -b` clean
- [x] `npm run build` exit 0
- [x] `vitest run` green (73/73)
- [x] No spaced `" — "` left in reader-facing prose (grep, excluding kept cases)
- [x] Visual spot-check (skills 6 groups, stats receipt) — screenshots confirmed
</content>
