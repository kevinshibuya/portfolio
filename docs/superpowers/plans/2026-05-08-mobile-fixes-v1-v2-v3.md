# Mobile fixes V1+V2+V3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the three mobile issues verified in `docs/superpowers/specs/2026-05-08-mobile-audit-findings.md` — tap targets that fail WCAG / HIG (V3), the 96 px archive counter→list gap (V1), and the route-list grid overflow at 320 px (V2).

**Architecture:** All edits land in `src/index.css`. Three of the violator rules are scoped under existing media queries; the remaining work adds two new mobile media queries (one for archive, one for route-list). No component, type, or test changes. Verification is mechanical: re-run the existing `/tmp/mobile-audit/audit3.mjs` and confirm `findings.json` reports zero overflow offenders and zero tap-target violations.

**Tech Stack:** TailwindCSS v4 (no config — `@theme` is in CSS), but every change here lives in plain CSS in `src/index.css`. Vite 6 dev server for visual checks. Playwright (already installed at `node_modules/@playwright/test`) for the audit script.

**Spec:** `docs/superpowers/specs/2026-05-08-mobile-audit-findings.md`

---

## File Structure

Single-file change set. Each task targets a specific block of `src/index.css`:

| File | Block / Selectors | Tasks |
|---|---|---|
| `src/index.css` | `.nav-lang` (L209), `.nav-brand` (L151) | Task 1 |
| `src/index.css` | `.project-detail-back` (L1359), `.project-detail-route-list-summary` (L1599) | Task 2 |
| `src/index.css` | `.archive-search` (L1229), `.archive-dropdown-trigger` (L1178) | Task 3 |
| `src/index.css` | new mobile rule for `#archive .archive-list.section-spacing-content` | Task 4 |
| `src/index.css` | new media query for `.project-detail-route-list-items` | Task 5 |
| `src/index.css` | full re-audit + cleanup | Task 6 |

Why no component changes: every issue is purely a layout/sizing concern. The `Archive.tsx` JSX already renders the right structure; only spacing needs adjusting. Same for `RouteList.tsx`. Same for the nav and project-detail back link.

---

## Pre-flight (one-time, do once before Task 1)

- [ ] **Step P1: Start the dev server in the background**

```bash
npm run dev > /tmp/vite-dev.log 2>&1 &
until curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 | grep -q 200; do sleep 1; done
echo "ready"
```

Expected: prints `ready` once Vite responds 200 on `/`.

- [ ] **Step P2: Capture baseline measurements**

Run the audit so we have a before-snapshot to compare against later:

```bash
node /tmp/mobile-audit/audit3.mjs 2>&1 | tail -3
```

Expected last line resembles: `=== 46 entries written to /tmp/mobile-audit-v3/findings.json ===`. If `/tmp/mobile-audit/audit3.mjs` is missing (state cleared between sessions), run the verification again from the new probe in Task 6 — this baseline is informational, not a gate.

---

## Task 1: V3 — Critical a11y tap targets in the nav

**Files:**
- Modify: `src/index.css:151` (.nav-brand)
- Modify: `src/index.css:209-216` (.nav-lang)

**Why these together:** both live in the fixed top header (`Header.tsx`). The header row is centered with `align-items: center`, so making the children taller is absorbed without re-layout.

- [x] **Step 1.1: Bump `.nav-lang` to a 44 × 44 px hit area**

Replace the existing rule at `src/index.css:209-216`:

Old:
```css
.nav-lang {
  font-size: 11px; font-weight: 600;
  color: var(--blue-400);
  letter-spacing: 0.15em;
  padding: 4px 0;
  transition: color 0.2s;
}
.nav-lang:hover { color: var(--ink); }
```

New:
```css
.nav-lang {
  font-size: 11px; font-weight: 600;
  color: var(--blue-400);
  letter-spacing: 0.15em;
  min-width: 44px; min-height: 44px;
  display: inline-flex; align-items: center; justify-content: center;
  padding: 0 12px;
  transition: color 0.2s;
}
.nav-lang:hover { color: var(--ink); }
```

- [x] **Step 1.2: Bump `.nav-brand` to a 44 px-tall hit area**

Replace the existing rule at `src/index.css:151`:

Old:
```css
.nav-brand { display: inline-flex; align-items: center; gap: 10px; }
```

New:
```css
.nav-brand {
  display: inline-flex; align-items: center; gap: 10px;
  min-height: 44px;
}
```

- [x] **Step 1.3: Visually verify in the browser**

Open `http://localhost:5173/` in a browser at iPhone-12 emulation (DevTools 390 × 844). Confirm:
1. The `PT` button in the top-right is now noticeably easier to tap; the visible glyph is unchanged.
2. The `ks` brand mark + "kevin shibuya" text on the left look unchanged in size.
3. Header total height is still 54–56 px (the brand was already 30 px, the new 44 px floor sits inside the header's existing padding).

- [x] **Step 1.4: Run the typecheck + build**

```bash
npm run build 2>&1 | tail -10
```

Expected: build succeeds with no TS or CSS errors. Output ends with `✓ built in <time>`.

- [x] **Step 1.5: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
fix(nav): bump .nav-lang and .nav-brand to 44px tap targets on mobile

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

**Fix-loop F (post-review):** code review of commit 452db2c flagged that the always-on 44 px floors made the desktop header row grow from 30 → 44 px. Resolved by wrapping the floors in a `@media (max-width: 720px)` block; desktop reverts to the original heights, mobile keeps the 44 × 44 tap target. Re-verified at 1280 + 390.

---

## Task 2: V3 — Critical a11y tap targets on the project detail page

**Files:**
- Modify: `src/index.css:1359-1369` (.project-detail-back)
- Modify: `src/index.css:1599-1606` (.project-detail-route-list-summary)

- [x] **Step 2.1: Bump `.project-detail-back` to a 44 px-tall hit area**

Replace the existing rule at `src/index.css:1359-1368`:

Old:
```css
.project-detail-back {
  display: inline-block;
  margin-bottom: 48px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  color: var(--bark);
  text-decoration: none;
  transition: color 0.2s;
}
```

New:
```css
.project-detail-back {
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  margin-bottom: 48px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  color: var(--bark);
  text-decoration: none;
  transition: color 0.2s;
}
```

(Switching `inline-block` → `inline-flex` lets `align-items: center` vertically center the arrow + label inside the 44 px box. The link's visual position is unchanged.)

- [x] **Step 2.2: Bump `.project-detail-route-list-summary` to a 44 px-tall hit area**

Replace the existing rule at `src/index.css:1599-1606`:

Old:
```css
.project-detail-route-list-summary {
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin-bottom: 12px;
}
```

New:
```css
.project-detail-route-list-summary {
  cursor: pointer;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blue-400);
  margin-bottom: 12px;
  min-height: 44px;
  display: flex;
  align-items: center;
}
```

- [x] **Step 2.3: Visually verify in the browser**

Navigate to `http://localhost:5173/projects/painel-da-reconstrucao` at iPhone-12 emulation. Confirm:
1. "← back to projects" sits flush at the top with a comfortable tap area; the text position is unchanged.
2. Tap the "▸ 19 ROUTES" expander — it expands the route list. The expander row is taller than before but the chevron and label still align.

- [x] **Step 2.4: Run the build**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [x] **Step 2.5: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
fix(detail): bump back-link and route-list-summary to 44px tap targets

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

**Fix-loop F (post-review):** code review of commit 362c007 caught that `display: flex` on `<summary>` strips the native disclosure marker on mobile (Chrome / Safari / Firefox treat `<summary>` as `list-item` by default; `flex` overrides that). Replaced the mobile flex/center approach with `padding-block: 14px` so the 44 px tap target is met without disturbing the marker. Re-verified at 1280 + 390.

---

## Task 3: V3 — Tap target polish on archive toolbar

**Files:**
- Modify: `src/index.css:1178-1191` (.archive-dropdown-trigger)
- Modify: `src/index.css:1229-1240` (.archive-search)

- [x] **Step 3.1: Bump `.archive-dropdown-trigger` to ≥ 44 px height**

Replace the existing rule at `src/index.css:1178-1191`:

Old:
```css
.archive-dropdown-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 14px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
```

New:
```css
.archive-dropdown-trigger {
  display: inline-flex; align-items: center; gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  color: var(--ink);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  text-transform: lowercase;
  letter-spacing: 0.02em;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
```

(Adding `min-height: 44px` floors the chip height; `align-items: center` keeps the label vertically centered. Padding-x bumped from 14 → 16 for proportional balance.)

- [x] **Step 3.2: Bump `.archive-search` to ≥ 44 px height**

Replace the existing rule at `src/index.css:1229-1240`:

Old:
```css
.archive-search {
  flex: 1 1 240px;
  min-width: 200px;
  padding: 9px 14px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  font: inherit;
  font-size: 12px;
  color: var(--ink);
  letter-spacing: 0.02em;
  transition: border-color 0.2s;
}
```

New:
```css
.archive-search {
  flex: 1 1 240px;
  min-width: 200px;
  min-height: 44px;
  padding: 11px 16px;
  border: 1px solid var(--mist);
  border-radius: 999px;
  background: var(--cream);
  font: inherit;
  font-size: 12px;
  color: var(--ink);
  letter-spacing: 0.02em;
  transition: border-color 0.2s;
}
```

- [x] **Step 3.3: Visually verify in the browser**

Open `http://localhost:5173/#archive` at iPhone-12 emulation. Confirm:
1. The search field ("search…") and the 5 dropdown chips (kind / type / editorial / year / sort) are all noticeably taller than before, but still pill-shaped and visually consistent.
2. Tapping each dropdown still opens its panel under the trigger; the panel position adjusts to the new trigger height.
3. The chips wrap across two rows the same way as before.

- [x] **Step 3.4: Run the build**

```bash
npm run build 2>&1 | tail -5
```

Expected: build succeeds.

- [x] **Step 3.5: Commit**

```bash
git add src/index.css
git commit -m "$(cat <<'EOF'
fix(archive): bump search input and dropdown triggers to 44px tap targets

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: V1 — Tighten archive counter→list gap on mobile

**Files:**
- Modify: `src/index.css` — extend the existing `@media (max-width: 720px)` block at `src/index.css:1342-1349` (the one that already overrides `.archive-row` for mobile).

**Why this approach:** `.archive-list` inherits `margin-top: 96px` from the `.section-spacing-content` utility class (defined at `src/index.css:489`). Overriding that utility globally would affect every section. Scoping the override to `#archive .archive-list.section-spacing-content` inside the existing 720 px media query keeps the change tight.

- [x] **Step 4.1: Add the archive-list mobile override**

Find the block at `src/index.css:1342-1349`:

```css
@media (max-width: 720px) {
  .archive-row {
    grid-template-columns: 32px 1fr 24px;
    gap: 12px;
    padding: 14px 16px;
  }
  .archive-preview, .archive-date { display: none; }
}
```

Replace it with:

```css
@media (max-width: 720px) {
  .archive-row {
    grid-template-columns: 32px 1fr 24px;
    gap: 12px;
    padding: 14px 16px;
  }
  .archive-preview, .archive-date { display: none; }
  /* Tighten the counter→list gap: utility is 96px desktop, ~32px mobile. */
  #archive .archive-list.section-spacing-content { margin-top: 32px; }
}
```

- [x] **Step 4.2: Visually verify in the browser**

Open `http://localhost:5173/#archive` at iPhone-12. Confirm:
1. The "169 items" counter sits about a thumb's width above the first row of the list (was previously a noticeable empty band).
2. Typing in the search field shrinks the counter+list block proportionally — the gap stays tight as the count drops.

- [x] **Step 4.3: Probe the gap with Playwright**

Run this one-shot probe (writes to /tmp, no project files touched):

```bash
node -e "
const { chromium } = require('/Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  for (const w of [390, 375, 320]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    const p = await ctx.newPage()
    await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' })
    await p.evaluate(() => document.getElementById('archive')?.scrollIntoView({ block: 'start', behavior: 'instant' }))
    await p.waitForTimeout(800)
    const gap = await p.evaluate(() => {
      const c = document.querySelector('.archive-count')
      const l = document.querySelector('.archive-list')
      return Math.round(l.getBoundingClientRect().top - c.getBoundingClientRect().bottom)
    })
    console.log(w, '→', gap, 'px')
    await ctx.close()
  }
  await b.close()
})()
"
```

Expected: each line prints a gap **≤ 40 px** (target ~32). If still 96, the override didn't take — check that the rule lives inside the `(max-width: 720px)` block.

- [x] **Step 4.4: Tick V1 in the spec**

Open `docs/superpowers/specs/2026-05-08-mobile-audit-findings.md` and change the V1 line under `## TODO` from `- [ ]` to `- [x]`.

- [x] **Step 4.5: Commit**

```bash
git add src/index.css docs/superpowers/specs/2026-05-08-mobile-audit-findings.md
git commit -m "$(cat <<'EOF'
fix(archive): tighten counter→list gap from 96px to 32px on mobile

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: V2 — Route-list grid stacks at small viewports

**Files:**
- Modify: `src/index.css:1607-1615` (.project-detail-route-list-items)

**Why a 480 px breakpoint:** at 375 the 240 px-fixed first column still leaves ~79 px for labels, and the labels gracefully wrap inside that. At 320 the second column collapses to ~24 px, forcing labels to overflow. 480 px is the standard "small phone" breakpoint that catches both 320 and the 360 px-class devices that exist in the wild.

- [x] **Step 5.1: Add the small-viewport media query for the route-list grid**

Find the existing rule at `src/index.css:1607-1615`:

```css
.project-detail-route-list-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: 240px 1fr;
  row-gap: 6px;
  column-gap: 16px;
}
```

Add this new media query block immediately after that rule (around `src/index.css:1616`, before the `.project-detail-route-list-item { display: contents; }` line that already lives there — keep that line where it is):

```css
@media (max-width: 480px) {
  .project-detail-route-list-items {
    grid-template-columns: 1fr;
    row-gap: 14px;
    column-gap: 0;
  }
}
```

(`row-gap` bumped from 6 → 14 px because each route now occupies two grid rows — the path on top, the label below — and 6 px would visually merge consecutive routes. The `display: contents` on `.project-detail-route-list-item` keeps each `<li>`'s two children placed by the parent grid; in single-column mode that means path-label-path-label flowing top-to-bottom.)

- [x] **Step 5.2: Visually verify at 320 px**

Open `http://localhost:5173/projects/painel-da-reconstrucao` at iPhone-SE (375) and again at a 320-wide custom emulation. Confirm:
1. At 320: the route list is one column. Each route shows its `/path` (blue monospace) on top, the human label below. No horizontal cropping.
2. At 375: still one column (since 375 < 480). Same vertical pairing. No regression on readability.
3. At 390 / 768 / desktop: still two columns (240 px + 1fr). Original layout preserved.

- [x] **Step 5.3: Probe overflow with Playwright**

```bash
node -e "
const { chromium } = require('/Users/luizarazzera/Desktop/keki/dev/personal_projects/portfolio/node_modules/playwright')
;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 320, height: 800 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
  const p = await ctx.newPage()
  await p.goto('http://localhost:5173/projects/painel-da-reconstrucao', { waitUntil: 'networkidle' })
  await p.waitForTimeout(1500)
  // Open <details>
  const summary = await p.\$('.project-detail-route-list-summary')
  if (summary) { await summary.click({ force: true }); await p.waitForTimeout(400) }
  const overflow = await p.evaluate(() => {
    const innerW = window.innerWidth
    const labels = [...document.querySelectorAll('.project-detail-route-label')]
    return labels.filter((el) => el.getBoundingClientRect().right > innerW + 0.5).length
  })
  console.log('overflowing labels at 320:', overflow)
  await b.close()
})()
"
```

Expected output: `overflowing labels at 320: 0`. Previously was 19.

- [x] **Step 5.4: Tick V2 in the spec**

Open `docs/superpowers/specs/2026-05-08-mobile-audit-findings.md` and change the V2 line under `## TODO` from `- [ ]` to `- [x]`.

- [x] **Step 5.5: Commit**

```bash
git add src/index.css docs/superpowers/specs/2026-05-08-mobile-audit-findings.md
git commit -m "$(cat <<'EOF'
fix(detail): stack route-list path/label as 1 column below 480px

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Final verification

**Files:** none modified (this task only ticks the remaining spec TODOs and runs the full audit suite).

- [ ] **Step 6.1: Run the unit tests**

```bash
npm run test:unit 2>&1 | tail -10
```

Expected: `Tests <N>/<N> passed`. Currently 64/64 — should remain green since no component or test files were touched.

- [ ] **Step 6.2: Run the lint check**

```bash
npm run lint 2>&1 | tail -10
```

Expected: zero errors.

- [ ] **Step 6.3: Run the production build**

```bash
npm run build 2>&1 | tail -10
```

Expected: `✓ built in <time>` with no warnings beyond the usual chunk-size info.

- [ ] **Step 6.4: Run the full mobile audit script**

```bash
node /tmp/mobile-audit/audit3.mjs 2>&1 | tail -3
```

Expected: writes `findings.json`. Then summarize:

```bash
python3 -c "
import json
data = json.load(open('/tmp/mobile-audit-v3/findings.json'))
ov = sum((f.get('overflow') or {}).get('offenderCount', 0) for f in data)
small = []
for f in data:
    for s in (f.get('taps') or {}).get('small', []):
        # Filter to the specific selectors we said we'd fix
        if any(k in s.get('cls','') for k in ['nav-lang','nav-brand','project-detail-back','project-detail-route-list-summary','archive-search','archive-dropdown-trigger']):
            small.append(s)
print('overflow offenders:', ov)
print('targeted-selector tap-target violations:', len(small))
for s in small: print(' -', s['cls'][:60], s['width'],'x',s['height'])
"
```

Expected:
- `overflow offenders: 0`
- `targeted-selector tap-target violations: 0`

If either is non-zero, identify which selector still fails and revisit Tasks 1–5.

- [ ] **Step 6.5: Tick the remaining spec TODOs**

In `docs/superpowers/specs/2026-05-08-mobile-audit-findings.md`, set these lines under `## TODO` to `- [x]`:

- V3-a (a11y critical): `.nav-lang` ✓
- V3-a (a11y critical): `.project-detail-back` ✓
- V3-a (a11y critical): `.project-detail-route-list-summary` ✓
- V3-b (HIG polish): `.archive-search`, `.archive-dropdown-trigger`, `.nav-brand` ✓
- All: `npm run build`, `npm run test:unit`, `npm run lint` pass ✓
- All: full re-run of `audit3.mjs` shows zero offenders + zero violations ✓

(V1 and V2 were ticked in their respective tasks.)

- [ ] **Step 6.6: Stop the dev server**

```bash
kill %1 2>/dev/null; jobs -l
```

Expected: no jobs listed afterward.

- [ ] **Step 6.7: Commit the spec ticks**

```bash
git add docs/superpowers/specs/2026-05-08-mobile-audit-findings.md
git commit -m "$(cat <<'EOF'
docs(spec): tick mobile-audit TODOs after V1+V2+V3 verification

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 6.8: Hand off to `superpowers:finishing-a-development-branch`**

The branch now has six commits implementing V1+V2+V3 plus the spec tick. Invoke the finishing skill to choose how to land them on `main` (merge locally vs. PR).

---

## Notes / explicit non-goals

- **`.hero-role`**: measured at 42 × 214 — 2 px short of the 44 px floor. Not addressed in this plan; it sits between "WCAG AA passes (≥ 24)" and "HIG ideal (44)" and the user's review marked it "marginal." If we want it later, the fix is `.hero-role { padding: 4px 0 6px; }` to gain 2 px from the bottom padding.
- **Archive dropdown panel overlap**: when `.archive-dropdown-trigger.is-open`, the dropdown panel covers the chips below it. Reviewed and confirmed as standard popover behavior, not a bug.
- **No new tests**: per `CLAUDE.md`, UI-only spacing changes don't require unit tests when the acceptance criteria are clear and the visual probe (Playwright) is the gate. The existing 64 unit tests should remain green because no component or data file is touched.
- **Plan saved to**: `docs/superpowers/plans/2026-05-08-mobile-fixes-v1-v2-v3.md`. Spec at `docs/superpowers/specs/2026-05-08-mobile-audit-findings.md`.
