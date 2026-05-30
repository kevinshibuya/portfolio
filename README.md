# kevin shibuya — portfolio

> soft blue editorial. lowercase, playful, confident.
> a bilingual developer portfolio — built in **en** and **pt** from the first commit.

**🔗 live —** [kevinshibuya.com](https://kevinshibuya.com/)

---

## stack

| layer | tech |
| --- | --- |
| framework | **React 19** + **TypeScript** (strict) |
| build | **Vite 6** + SWC |
| styling | **Tailwind CSS v4** (Vite plugin, configured via CSS `@theme` — no `tailwind.config.js`) |
| react animation | **Framer Motion** — enter/exit, hover, layout |
| scroll / timeline | **GSAP** + ScrollTrigger, **Lenis** smooth scroll |
| webgl / 3d | **React Three Fiber** (`@react-three/fiber` + `drei`, `three`) |
| i18n | **react-i18next** — en + pt |

Each animation library stays in its own lane — they're never mixed for the same effect.

## getting started

```bash
npm install      # node 22+
npm run dev      # vite dev server
npm run build    # tsc -b && vite build
npm run preview  # serve the production build (port 4173)
npm run test     # unit (vitest) + e2e (playwright)
```

## structure

```
src/
  components/
    layout/        # Header, Footer, SmoothScroll
    sections/      # Hero, Projects, WorkExperience, Skills, Stats, Contact …
    ui/            # reusable atoms (SectionHeading, Stagger, …)
    canvas/        # React Three Fiber scenes
    projectDetail/ # project case-study page parts
  pages/           # Home, ProjectDetail (routed)
  hooks/           # useLenis, useReducedMotion, scroll/entrance hooks
  context/         # MotionContext
  i18n/            # setup + locales/{en,pt}.json
  data/            # typed portfolio content (projects, embeds, social)
  types/           # shared interfaces
  utils/           # animation presets, constants
```

Below-the-fold sections are lazy-loaded and warmed at idle, so the initial JS chunk only carries the hero.

## notes

- **bilingual by design** — all copy is authored in en + pt; switch via the nav toggle or `?lang=en|pt`.
- **motion is respectful** — every animation honours `prefers-reduced-motion`.
- the 3D model in the footer is used under **CC-BY**; attribution is in the site footer.
