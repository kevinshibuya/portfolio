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
