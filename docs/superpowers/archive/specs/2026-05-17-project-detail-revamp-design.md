# Project Detail — Editorial Digest Revamp

**Date:** 2026-05-17
**Branch:** `feat/project-detail-revamp`
**Scope:** The 7 highlight projects' detail pages (`/projects/:slug`). Header (back · eyebrow · title · tagline · CTAs · stat row) stays unchanged. Contact + Footer stay unchanged.

## Problem

The current detail page reads like a Medium post. The desktop and mobile mockups are oversized (full container width), the mobile mockup composite (rotated phones photo) doesn't visually center in its frame, and the body is two ~150-word bilingual paragraphs followed by another mockup and another long paragraph. Tech and "the trick" lose to the wall of text.

## Goal

Replace the freeform `story: Block[]` rendering on the 7 highlights with a structured editorial digest:

1. **Pitch** — display-type lead, lowercase, italic-blue accent (`<em>`), 14-18 words. Replaces the first body paragraph.
2. **Desktop mockup** — framed, max 880px wide, centered.
3. **What shipped** — mobile mockup (max 360px, centered, no off-axis bleed) beside a 14-20-word sentence.
4. **Trick + stack card** — single sand-bg rounded card: "the trick" eyebrow + 18-28-word body with inline `<code>` + `<em>` → mist divider → "stack" eyebrow → tech pills.

Total prose under the hero drops from ~600 bilingual words to ~60. The 3 stats stay in the hero. Per-project rosters (routes, photographer counts, etc.) are out of scope. Screenshot gallery is out of scope.

## Data shape changes

### `src/types/content.ts`

Add three new optional bilingual fields to `Project`:

```ts
interface Project {
  // ... existing ...
  pitch?: Bilingual
  whatShipped?: Bilingual
  trick?: Bilingual
}
```

`story?: Block[]` stays in the type (still valid for hypothetical non-highlight detail pages). The Block union and its renderers stay untouched.

### `src/data/projects.ts`

For each of the 7 highlight projects:

- ADD: `pitch`, `whatShipped`, `trick` (bilingual)
- DROP: `story` (entire block array)
- DROP: `routes` (only painel had this — RouteList retires from the detail page)
- DROP: `screenshots` (no longer rendered on detail page)

Other fields (`tagline`, `description`, `stats`, `techStack`, `mockups`, `liveUrl`, etc.) stay as-is.

## Drafted copy (review target — edit in place during implementation)

### painel-da-reconstrucao

- **pitch.en:** a long-running *data dashboard* for GZH, tracking every real spent on rio grande do sul's flood recovery.
- **pitch.pt:** um *painel de dados* de longa duração para a GZH, que acompanha cada real gasto na recuperação das enchentes do rio grande do sul.
- **whatShipped.en:** a static next.js 14 bundle on azion's edge — one 488 KB `data.json` powers 19 routes, three charting libraries, and a leaflet map.
- **whatShipped.pt:** bundle estático next.js 14 na edge da azion — um `data.json` de 488 KB alimenta 19 rotas, três libs de chart e um mapa leaflet.
- **trick.en:** a *selector layer* in `src/lib/utils.ts` reduces the flat JSON into per-government, per-segment, and summary shapes — memoized by call site so totals never recompute across re-renders.
- **trick.pt:** uma *camada de selectors* em `src/lib/utils.ts` reduz o JSON achatado em recortes por esfera, por segmento e de sumário — memoizada por call site, sem recálculo entre re-renders.

### enquetes-gzh

- **pitch.en:** two *real-time apps* over one firestore — a newsroom backoffice and a public vote widget that journalists drop into articles.
- **pitch.pt:** dois *apps em tempo real* sobre um firestore — um backoffice para a redação e um widget público que jornalistas inserem em matérias.
- **whatShipped.en:** react 18 + vite + shadcn/ui. backoffice google-auth locked to `@gruporbs.com.br`; embed loads any poll by `?poll_id=` and streams percentages via `onSnapshot`.
- **whatShipped.pt:** react 18 + vite + shadcn/ui. backoffice com google-auth restrito a `@gruporbs.com.br`; embed carrega qualquer enquete por `?poll_id=` e transmite percentuais via `onSnapshot`.
- **trick.en:** duplicate-vote detection uses a `localStorage` device ID as the firestore doc ID — *O(1) check, zero server round-trip* for repeat visitors; vote commits via atomic `increment()`.
- **trick.pt:** a detecção de voto duplicado usa um device id em `localStorage` como id do documento firestore — *check O(1), sem round-trip* para visitantes recorrentes; o voto entra por `increment()` atômico.

### ia-na-redacao

- **pitch.en:** an *internal grupo rbs hub* where journalists share how they actually use ai — seven video testimonials, four long-form articles, no backend.
- **pitch.pt:** um *hub interno do grupo rbs* onde jornalistas compartilham como usam ia no dia a dia — sete vídeos curtos, quatro artigos longos, sem backend.
- **whatShipped.en:** a react + vite spa on a private rbs host. one `course-content.json` is the cms; navigation between dashboard, player, and reader runs purely on `useState`.
- **whatShipped.pt:** spa react + vite em host privado da rbs. um `course-content.json` faz de cms; navegação entre dashboard, player e leitor é pura `useState`.
- **trick.en:** *one shared course shell* — sidebar list + main panel + progress tracker — backs both the video player and the article reader, so completion and sequential navigation work identically across content types.
- **trick.pt:** *um único shell de curso* — sidebar + painel principal + progress tracker — atende o player de vídeo e o leitor de artigo, então progresso e navegação sequencial funcionam igual entre tipos.

### fotos-do-ano-2025

- **pitch.en:** GZH's year-end *photo retrospective* — eight staff photographers, eight scroll-driven sections, one fullscreen lightbox.
- **pitch.pt:** a *retrospectiva fotográfica* de fim de ano da GZH — oito fotógrafos do quadro, oito seções guiadas por scroll, um lightbox fullscreen.
- **whatShipped.en:** a no-backend vite 6 + react 18 spa, deployed under `/especiais/fotos-do-ano-2025/`. all copy inline in `App.tsx`; brightcove iframes own the video lifecycle.
- **whatShipped.pt:** spa vite 6 + react 18 sem backend, sob `/especiais/fotos-do-ano-2025/`. toda a copy mora em `App.tsx`; iframes do brightcove cuidam do ciclo do vídeo.
- **trick.en:** scroll is driven entirely by *motion's `useScroll` + `useTransform`*, with a `generateSquares` helper laying out parallax thumbnails on stable deterministic positions — every animation stays on `transform` and `opacity`.
- **trick.pt:** o scroll é guiado por *`useScroll` + `useTransform` do motion*, com `generateSquares` distribuindo thumbnails parallax em posições determinísticas estáveis — toda animação fica em `transform` e `opacity`.

### peleia-gre-nal

- **pitch.en:** a *super trunfo card duel* themed around porto alegre's gre-nal — pick a side, play ten rounds against the house, watch a podium decide it.
- **pitch.pt:** um *duelo de super trunfo* tematizado pelo gre-nal — escolha um lado, jogue dez rodadas contra a casa, e um pódio decide o resultado.
- **whatShipped.en:** a single-route react + vite + emotion spa. game progression is a client-side state machine; 56 athlete portraits, four stat icons, and bronze/silver/gold medals ship as static assets.
- **whatShipped.pt:** spa react + vite + emotion de rota única. a progressão é uma state machine no cliente; 56 retratos, quatro ícones de atributo e medalhas bronze/prata/ouro são estáticos.
- **trick.en:** the *gangorra* swaps between three pre-baked webp illustrations to visualize score momentum, and card reveals run in two sequential phases — opponent card first, then winning-stat highlight — for a TV-style read.
- **trick.pt:** a *gangorra* alterna entre três webps pré-renderizados para visualizar o momentum, e cada carta vira em duas fases — primeiro a do adversário, depois o destaque no atributo vencedor — leitura estilo TV.

### hotmart-bunde

- **pitch.en:** a *scrapbook landing* for a 50+ hour political-fundamentals course — pure conversion funnel, no auth, no cart, no payment surface.
- **pitch.pt:** uma *landing artesanal* para um curso de 50+ horas de fundamentos políticos — funil puro de conversão, sem auth, sem carrinho, sem pagamento.
- **whatShipped.en:** a react 18 + vite 6 spa on cloudflare pages, with tailwind v4 expressing the entire scrapbook system as utility classes — paper textures, washi tape, torn edges, layered shadows.
- **whatShipped.pt:** spa react 18 + vite 6 no cloudflare pages, com tailwind v4 expressando o sistema scrapbook todo como classes utilitárias — texturas de papel, fitas washi, bordas rasgadas e sombras em camadas.
- **trick.en:** a *`?edit=1` url flag* turns the 17-instructor hero into an in-browser tuning mode, letting per-regime overrides be dragged into place without a redeploy.
- **trick.pt:** uma *flag `?edit=1` na url* transforma o hero dos 17 professores em modo de ajuste no navegador, permitindo arrastar overrides por regime sem novo deploy.

### fotos-do-ano-2024

- **pitch.en:** *zero hora's 2024 photo retrospective* — eight staff photographers, one image each from the may floods, told as a single first-person record.
- **pitch.pt:** a *retrospectiva fotográfica 2024* da zero hora — oito fotógrafos do quadro, uma imagem de cada das enchentes de maio, contada como um único registro em primeira pessoa.
- **whatShipped.en:** a vite-built react spa under `/especiais/fotos-do-ano-2024/`. each section pairs a featured photo, a first-person caption, an inline `<video>` testimonial, and a black-and-white portrait.
- **whatShipped.pt:** spa react com vite sob `/especiais/fotos-do-ano-2024/`. cada seção combina foto-destaque, legenda em primeira pessoa, depoimento `<video>` inline e retrato em preto-e-branco.
- **trick.en:** a *scroll-driven sticky wordmark* tracks position over the hero, repositions to each panel's top-right kicker, and switches color from peach to white as dark photo panels slide underneath.
- **trick.pt:** um *wordmark fixo guiado por scroll* acompanha o hero, reposiciona-se no canto superior direito de cada painel e troca de pêssego para branco quando painéis escuros passam por baixo.

## Components

### New (4)

#### `src/components/projectDetail/Pitch.tsx`

```tsx
interface Props { text: Bilingual; lang: 'en' | 'pt' }
```

- Typography: PJ Sans 600, `clamp(28px, 4vw, 56px)`, line-height 1.1, lowercase, `color: text-ink`.
- Renders inline markdown via the shared `parseInline` helper. Plan extends `parseInline` to support inline `` `code` `` so technical terms (`?edit=1`, `localStorage`, etc.) render correctly across Pitch / WhatShipped / Trick.
- Enter animation: single fade-up (700ms, ease `[0.22, 1, 0.36, 1]`), respects `prefersReducedMotion`. Word-split was considered but collides with the multi-word italic accents the drafted copy relies on (`*data dashboard*`, `*real-time apps*`).
- Container: max-width 880px to match the mockup band rhythm.

#### `src/components/projectDetail/MockupFrame.tsx`

```tsx
interface Props {
  src: string
  variant: 'desktop' | 'mobile'
  alt: string
}
```

- Desktop: `max-width: 880px`, centered, soft shadow (existing `--wide` figure shadow scaled down), rounded `14px`.
- Mobile: `max-width: 360px`, centered, same treatment. **Fixes the current off-axis bleed** by constraining width and using `object-fit: contain` instead of letting the `--wide` figure stretch the rotated-phones photo edge-to-edge.
- `loading="lazy"`, `decoding="async"`.
- Enter animation: fade-up + scale 0.96→1, `duration: 0.6`, ease `[0.22, 1, 0.36, 1]`. Respects `prefersReducedMotion`.

Replaces the existing `Mockup` block on highlight pages; the original `blocks/Mockup.tsx` stays for backwards compat with `story[]`-driven pages.

#### `src/components/projectDetail/WhatShippedRow.tsx`

```tsx
interface Props {
  mobileSrc: string
  text: Bilingual
  lang: 'en' | 'pt'
  alt: string
}
```

- Desktop: 2-col grid, `grid-template-columns: minmax(0, 360px) 1fr`, gap 48px, vertical centered.
- Mobile (`<768px`): stacks — mockup first, text below, gap 32px.
- Left col: `MockupFrame` with `variant="mobile"`.
- Right col: blue-400 small-caps eyebrow "what shipped" → PJ Sans 500, 17px, line-height 1.5, `color: text-ink`. Renders inline `<code>` (sand bg + bark text, no border) and `<em>` (italic, blue-400).
- Enter: stagger — image at delay 0, text at delay 0.12.

#### `src/components/projectDetail/TrickCard.tsx`

```tsx
interface Props {
  trick: Bilingual
  stack: string[]
  lang: 'en' | 'pt'
}
```

- Single card, `bg-bg-sand`, rounded `18px`, padding `32px` desktop / `24px` mobile, max-width to match `.project-detail-story`.
- Vertical stack:
  1. Eyebrow "the trick" — blue-400 small caps, 12px, letter-spacing 0.12em.
  2. Body — PJ Sans 500, 17px, line-height 1.55, `text-ink`. Inline `<code>` (no border, sand-darker bg from existing token) and `<em>` (italic blue-400) supported.
  3. Mist 1px divider, `24px` vertical margin.
  4. Eyebrow "stack" — same treatment.
  5. Tech pills — lifted from existing `StackSection` pill styling (rounded-full, mist border, blue-400 hover). Wrap freely.
- Enter: fade-up `duration: 0.5`, `delay: 0.05`.

### Removed invocations in `src/pages/ProjectDetail.tsx`

- `<BlockRenderer>` (highlights no longer have `story`)
- `<StackSection>` (replaced by `TrickCard`'s stack row)
- `<RouteList>` (rosters skipped)
- `<Footnotes>` (verify zero usage on highlights; remove invocation; keep file in tree)
- `<Mockup>` block usage (replaced by `MockupFrame`)

### New `ProjectDetail.tsx` flow

```tsx
<main>
  <section className="section">
    <Hero project={project} lang={lang} />
    <ScrollCue />
    {project.pitch && <Pitch text={project.pitch} lang={lang} />}
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
      <TrickCard trick={project.trick} stack={project.techStack} lang={lang} />
    )}
  </section>
  <Suspense fallback={<div style={{ minHeight: 200 }} aria-hidden />}>
    <Contact showSectionIndex={false} />
    <Footer />
  </Suspense>
</main>
```

Graceful fallback: if a highlight is missing any of the three new fields, that section just doesn't render. This means a partially-converted state during implementation never breaks the page.

## Animation & motion

All enter animations use ease `[0.22, 1, 0.36, 1]`. Each new component respects `useMotion().prefersReducedMotion` — reduced-motion gets fade-only with no transform.

| Component | Animation | Trigger |
|---|---|---|
| Pitch | Single fade-up, 700ms (word-split conflicted with multi-word `*em*` accents) | `whileInView` once, amount 0.4 |
| MockupFrame | Fade-up + scale 0.96→1, 600ms | `whileInView` once, amount 0.3 |
| WhatShippedRow | Stagger: image first, text +120ms | `whileInView` once, amount 0.3 |
| TrickCard | Fade-up, 500ms | `whileInView` once, amount 0.3 |

## Out of scope

- Per-project rosters (routes, photographer lists, instructor counts)
- Screenshot gallery on detail page
- Painel's RouteList (retires)
- Non-highlight detail pages (the `story: Block[]` flow + existing block components stay alive)
- Cleanup of now-dead block component files
- Footnotes content (the component stays in the tree; invocation is removed)

## Verification

- `npm run build` passes with no TypeScript errors.
- `npm run dev` — visually walk all 7 highlight detail pages on desktop (1440px) and mobile (375px). Confirm:
  - Mockups don't bleed; mobile mockup centers cleanly on every project.
  - Pitch displays italic-blue `<em>` accent where authored.
  - Trick card renders inline `<code>` and `<em>` correctly.
  - No console warnings about missing mockup variants.
  - `prefers-reduced-motion` (Chrome DevTools rendering tab) disables transforms.
- `npm run preview` and run Lighthouse on one highlight page — performance ≥95 on desktop (memory: dev server scores 20-30 points lower; preview only).

## TODO

- [x] Add `pitch`, `whatShipped`, `trick` to the `Project` interface in `src/types/content.ts`
- [x] Add drafted copy to all 7 highlight projects in `src/data/projects.ts` (painel, enquetes, ia-na-redacao, fotos-2025, peleia, hotmart-bunde, fotos-2024)
- [x] Drop `story`, `routes`, `screenshots` from those same 7 entries
- [x] Build `src/components/projectDetail/Pitch.tsx`
- [x] Build `src/components/projectDetail/MockupFrame.tsx`
- [x] Build `src/components/projectDetail/WhatShippedRow.tsx`
- [x] Build `src/components/projectDetail/TrickCard.tsx`
- [x] Rewrite `src/pages/ProjectDetail.tsx` flow per spec
- [x] Remove `Footnotes` invocation from `ProjectDetail.tsx` (file stays)
- [x] `npm run build` passes
- [ ] Visual check: all 7 highlight pages, desktop + mobile viewport, in `npm run dev` *(deferred to user)*
- [ ] Visual check: `prefers-reduced-motion` disables transforms on new components *(deferred to user)*
- [ ] Lighthouse run on `npm run preview` — performance ≥95 *(deferred to user)*

---

## v3 amendment (2026-05-17 — after first visual review)

After a full visual pass, the user flagged five issues with v2:

1. The two mockups sit too close together with not enough breathing room.
2. `whatShipped` should sit **above** the mobile mockup as a full-width prose block, not beside it.
3. The "trick" prose should take the slot beside the mobile mockup that `whatShipped` used to occupy.
4. The tech stack should be its own section, not bundled inside a `TrickCard`.
5. The copy is too tight after the rewrite — needs to expand.
6. The Pitch typography (large heavy lowercase) competes with the hero title, which uses the same treatment at a larger size.
7. Section entrances should feel cinematic.

### New flow (replaces the v2 flow)

```
Hero
ScrollCue
Pitch                        ← option C typography (see below)
MockupFrame variant=desktop
WhatShipped                  ← NEW: full-width prose, eyebrow + paragraph
MobileTrickRow               ← RENAMED from WhatShippedRow: mobile mockup left, trick prose right
StackSection                 ← re-imported (lives in src/components/projectDetail/StackSection.tsx)
```

### Component delta

| Component | v2 status | v3 status |
|---|---|---|
| `Pitch` | exists | KEEP, update typography + animation |
| `MockupFrame` | exists | KEEP, add variant-aware scroll-tied animation (desktop) + tilt-settle (mobile) |
| `WhatShippedRow` | exists | RENAME to `MobileTrickRow`. New prop shape: takes `trick: Bilingual` instead of `text: Bilingual`. Eyebrow label switches to `projectDetail.trick` |
| `WhatShipped` | — | CREATE: full-width prose section (eyebrow `projectDetail.whatShipped` + paragraph) |
| `TrickCard` | exists | DELETE — replaced by `MobileTrickRow` + standalone `StackSection` |
| `StackSection` | unused on highlights | RE-IMPORT in `ProjectDetail.tsx` after `MobileTrickRow` |

### Pitch typography — option C

```css
.project-detail-pitch {
  max-width: 680px;
  margin: 32px auto 64px;
  font-size: clamp(20px, 2vw, 28px);
  font-weight: 500;
  line-height: 1.4;
  color: var(--bark);            /* slightly softer than ink */
  text-transform: none;          /* drop the lowercase enforcement — let proper nouns render naturally */
}
.project-detail-pitch::before {
  content: "";
  display: block;
  width: 28px;
  height: 2px;
  background: var(--blue-400);
  margin: 0 0 20px;
}
```

This creates contrast against the bold display hero title. Proper nouns ("GZH", "Política Essencial") now render with their authored casing.

### Expanded copy (replaces v2 drafted copy for `whatShipped` and `trick`)

Pitch stays as written in the original spec. Length targets shift:
- `whatShipped`: was ~14-20 words, now ~40-50 words
- `trick`: was ~18-28 words, now ~45-55 words

Drafted expansions for all 7 highlights:

**painel-da-reconstrucao**
- **whatShipped.en:** "a next.js 14 app router project in typescript, built with `output: 'export'` and deployed as static html on azion's edge — no node runtime. one 488 KB `public/data.json`, denormalized by the newsroom, feeds 19 routes through `useDataFetching` (SWR-backed). UI primitives from mantine and nextui."
- **whatShipped.pt:** "projeto next.js 14 app router em typescript, com `output: 'export'` e deploy estático na edge da azion — sem runtime node. um `public/data.json` de 488 KB, denormalizado pela redação, alimenta 19 rotas via `useDataFetching` (SWR por baixo). primitivos de UI vêm de mantine e nextui."
- **trick.en:** "the *selector layer* in `src/lib/utils.ts` — `calculateSumarioData`, `calculateRecursosData`, `calculateSegmentoData` — reduces the flat JSON into per-government, per-segment, and summary shapes each route consumes. results cache through `memoizedCalculation`, a `Map`-backed memoization keyed by call site. *three charting libraries* — highcharts, apexcharts, chart.js — share the same in-memory dataset."
- **trick.pt:** "a *camada de selectors* em `src/lib/utils.ts` — `calculateSumarioData`, `calculateRecursosData`, `calculateSegmentoData` — reduz o JSON achatado em recortes por esfera, por segmento e de sumário. resultados cacheiam via `memoizedCalculation`, memoização ancorada em `Map` chaveada por call site. *três libs de chart* — highcharts, apexcharts, chart.js — sobre o mesmo dataset em memória."

**enquetes-gzh**
- **whatShipped.en:** "two apps over one firestore: a *backoffice* where editors create polls and copy embed snippets, and a *public widget* where readers vote and watch percentages update live. backoffice authenticates via google oauth locked to `@gruporbs.com.br`; embed loads any poll by `?poll_id=` and streams via firestore `onSnapshot`."
- **whatShipped.pt:** "dois apps sobre um firestore: um *backoffice* onde editores criam enquetes e copiam snippets de embed, e um *widget público* onde leitores votam e veem percentuais ao vivo. backoffice autentica via google oauth restrito a `@gruporbs.com.br`; embed carrega qualquer enquete por `?poll_id=` e transmite via `onSnapshot` do firestore."
- **trick.en:** "duplicate-vote detection uses a `localStorage` device ID as the firestore *document ID* under `votes/{pollId}/userVotes/{deviceId}` — making the check an *O(1) `getDoc`* with zero server round-trip for repeat visitors. a confirmed vote commits via one `updateDoc` that increments `voteCounts.{optionId}` and `totalVotes` atomically through firestore's `increment()`."
- **trick.pt:** "a detecção de voto duplicado usa um device id em `localStorage` como *id do documento* firestore em `votes/{pollId}/userVotes/{deviceId}` — virando um check *`getDoc` O(1)* sem round-trip para visitantes recorrentes. um voto confirmado dispara um único `updateDoc` que incrementa `voteCounts.{optionId}` e `totalVotes` atomicamente via `increment()` do firestore."

**ia-na-redacao**
- **whatShipped.en:** "a react + vite spa deployed as a static build on a private rbs host. all editorial content comes from one `course-content.json` fetched at runtime; navigation between dashboard, video player, and article reader runs purely on `useState` — no backend, no client-side router. tailwind v4 with a touch of emotion."
- **whatShipped.pt:** "spa react + vite com build estático em host privado da rbs. todo o conteúdo editorial vem de um `course-content.json` carregado em runtime; navegação entre dashboard, player de vídeo e leitor de artigo roda em pura `useState` — sem backend, sem roteador. tailwind v4 com um toque de emotion."
- **trick.en:** "*one shared course shell* — sidebar list + main panel + progress tracker — backs both the video player and the article reader. `articles[]` swap an HTML blob for an ordered `content[]` array of typed blocks (`paragraph`, `quote`) so the renderer applies pull-quote styling *structurally*. publishing is one JSON edit plus dropping media into `assets/videos/`."
- **trick.pt:** "*um único shell de curso* — sidebar + painel principal + progress tracker — atende o player de vídeo e o leitor de artigo. `articles[]` trocam um blob de HTML por um array `content[]` de blocos tipados (`paragraph`, `quote`), então o renderer aplica estilo de citação *estruturalmente*. publicar é editar um JSON e soltar mídia em `assets/videos/`."

**fotos-do-ano-2025**
- **whatShipped.en:** "a no-backend single-page app built with vite 6, react 18, typescript, and SWC. all copy and image manifests are co-located inline in `App.tsx` — one `<PhotographerSection>` per photographer. brightcove iframes embed directly so the react tree never owns the player lifecycle."
- **whatShipped.pt:** "spa sem backend feita com vite 6, react 18, typescript e SWC. toda a copy e os manifestos de imagem ficam inline em `App.tsx` — um `<PhotographerSection>` por fotógrafo. iframes do brightcove embedam direto, então a árvore react nunca controla o ciclo do player."
- **trick.en:** "scroll is driven entirely by *motion's `useScroll` + `useTransform`* hooks scoped per-section ref. `scrollYProgress` feeds transforms that drive parallax y-offsets, opacity reveals, image-width compression, and a sticky author-rail drift — all on `transform` and `opacity` to stay on the GPU compositor. parallax thumbnail positions are deterministic and memoized across scroll ticks."
- **trick.pt:** "o scroll é guiado por inteiro por *`useScroll` + `useTransform` do motion*, com escopo por ref de seção. `scrollYProgress` alimenta transforms que conduzem offsets de parallax em y, revelações por opacity, compressão de largura e drift vertical da coluna do autor — tudo em `transform` e `opacity` para ficar na GPU. posições de thumbnail são determinísticas e memoizadas entre frames de scroll."

**peleia-gre-nal**
- **whatShipped.en:** "a single-route react + vite spa with emotion styling. game progression is a *client-side state machine* (intro → rules → team picker → 10 × {draw → stat-pick → result} → podium) with no URL transitions. all roster data, player stats, and matchup logic ship as static assets — 56 athlete portraits, four stat icons, podium illustrations."
- **whatShipped.pt:** "spa react + vite de rota única com emotion. a progressão do jogo é uma *state machine no cliente* (intro → regras → seleção → 10 × {saca → escolhe atributo → resultado} → pódio) sem transições de URL. todos os dados de elenco, atributos e lógica de comparação saem como assets estáticos — 56 retratos, quatro ícones, ilustrações de pódio."
- **trick.en:** "the *gangorra* — a score-delta momentum visualization — swaps between three pre-baked webp illustrations via framer motion easing. card-flip reveals are choreographed in *two sequential phases*: opponent card reveal first, then stat-row highlight on the winning attribute — producing a TV-style result read rather than a single-frame cut. a portrait-orientation gate enforces vertical layout."
- **trick.pt:** "a *gangorra* — visualização de momentum por diferença de pontos — alterna entre três webps pré-renderizados via easing do framer motion. as viradas de carta são coreografadas em *duas fases sequenciais*: revelação da carta adversária primeiro, depois destaque no atributo vencedor — leitura estilo TV em vez de corte de frame único. uma porta de orientação retrato força o layout vertical."

**hotmart-bunde**
- **whatShipped.en:** "a react 18 + vite 6 + typescript spa on cloudflare pages, styled with tailwind v4. the entire scrapbook system — paper textures, washi tape, torn edges, layered shadows — is expressed as utility classes (`.paper-texture`, `.washi-tape-*`, `.torn-edge-*`) plus a small set of primitives (`PaperCard`, `WashiTape`, `TornPaperSection`)."
- **whatShipped.pt:** "spa react 18 + vite 6 + typescript no cloudflare pages, com tailwind v4. o sistema scrapbook todo — texturas de papel, fitas washi, bordas rasgadas, sombras em camadas — é expresso como classes utilitárias (`.paper-texture`, `.washi-tape-*`, `.torn-edge-*`) mais um pequeno conjunto de primitivos (`PaperCard`, `WashiTape`, `TornPaperSection`)."
- **trick.en:** "the hero professor-circles section — *17 instructor portraits orbiting a centerpiece* — uses per-regime manual position overrides in `src/components/hero/professorOverrides.ts`. a *`?edit=1` url flag* turns the layout into an in-browser tuning mode for dragging circles into place. edge wrinkles on paper elements are generated procedurally via a `wrinkledClipPath` utility, so each card's torn edge is unique."
- **trick.pt:** "a seção hero dos círculos de professores — *17 retratos orbitando um centro* — usa overrides manuais por regime em `src/components/hero/professorOverrides.ts`. uma *flag `?edit=1` na url* transforma o layout em modo de ajuste no navegador, arrastando círculos para a posição desejada. bordas enrugadas dos elementos de papel são geradas proceduralmente via `wrinkledClipPath`, então cada borda rasgada é única."

**fotos-do-ano-2024**
- **whatShipped.en:** "a vite-built react spa, statically exported and served under `/especiais/fotos-do-ano-2024/`. each section pairs a featured flood photograph, a first-person caption from the photographer, an embedded HTML5 `<video>` testimonial pointing at `assets/<Photographer>.mp4`, and a black-and-white portrait headshot. typography in hepta slab via google fonts."
- **whatShipped.pt:** "spa react com vite, exportada estaticamente e servida sob `/especiais/fotos-do-ano-2024/`. cada seção combina uma foto-destaque das enchentes, uma legenda em primeira pessoa do fotógrafo, um depoimento `<video>` HTML5 apontando para `assets/<Photographer>.mp4`, e um retrato em preto-e-branco. tipografia em hepta slab via google fonts."
- **trick.en:** "the *scroll-driven sticky wordmark* — 'ZEROHORA — fotos do ano 2024' — stays fixed over the hero, tracks scroll position, fades, repositions to each photographer panel's top-right kicker, and *switches color from peach to white* as dark-background photo panels slide underneath. the layout alternates full-bleed photographic panels with peach narrative panels to pace the disaster narrative."
- **trick.pt:** "o *wordmark fixo guiado por scroll* — 'ZEROHORA — fotos do ano 2024' — fica preso sobre o hero, acompanha o scroll, esmaece, reposiciona-se no canto superior direito de cada painel e *muda de cor de pêssego para branco* quando painéis de fundo escuro passam por baixo. o layout alterna painéis fotográficos de borda a borda com painéis narrativos pêssego para dar compasso à narrativa."

### Cinematic animation plan

GSAP isn't installed in the project despite the CLAUDE.md stack notes. Using Framer Motion's `useScroll` + `useTransform` for scroll-tied effects — identical visual outcome with zero new deps. All animations respect `prefersReducedMotion`.

| Component | Entrance | Scroll-tied |
|---|---|---|
| Pitch | Fade-up 32px + blur 6px → 0, 1000ms ease `[0.22, 1, 0.36, 1]` | — |
| MockupFrame `variant=desktop` | Fade-up 24px + scale 0.94 → 1, 700ms | `useScroll` per ref: scale 0.96 → 1.02 across enter; `y` parallax -20 → 20 |
| WhatShipped | Fade-up 24px, 800ms | — |
| MobileTrickRow (mockup) | Rotate `-3deg → 0` + slide-up 24px, 1000ms back-ease | — |
| MobileTrickRow (trick text) | Fade-up 16px, 700ms, delay 200ms after mockup | — |
| StackSection (existing) | Pill cascade left-to-right, 40ms stagger | — |

### CSS delta

**Drop:**
- All `.project-detail-trick*` selectors (TrickCard gone)
- The current `.project-detail-what-shipped` grid (was 2-col mobile + text)

**Add:**
- `.project-detail-what-shipped` — full-width prose block (max-width 720px, centered)
- `.project-detail-mobile-trick` — 2-col grid (mobile mockup left, trick text right; stacks at <720px)

**Keep but update:**
- `.project-detail-pitch` — option C styling (see Pitch typography block above)
- `.project-detail-mockup-frame--*` — unchanged

### v3 TODO

- [ ] Spec amendment committed (this section)
- [x] CSS rewrite (drop trick, restyle pitch + what-shipped, add mobile-trick)
- [x] Update Pitch component (cinematic fade + blur)
- [x] Update MockupFrame component (scroll-tied scale + parallax for desktop; tilt-settle entrance for mobile)
- [x] Create WhatShipped component
- [x] Rename WhatShippedRow → MobileTrickRow (new prop shape, tilt-settle + word-stagger animation)
- [x] Delete TrickCard component
- [x] Update ProjectDetail.tsx flow + re-import StackSection
- [x] Expand whatShipped + trick copy for all 7 highlights
- [x] `npm run build` and `npm run test:unit` pass
- [ ] Visual check by user *(deferred)*
- [ ] Lighthouse on `npm run preview` ≥95 *(deferred)*
