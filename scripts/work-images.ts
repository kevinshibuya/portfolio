import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/**
 * Builds every project image the site serves, from the raw captures kept
 * under public/images/projects/<source>/.
 *
 * One treatment for all of them: a capture is shown whole, never inside a
 * device frame. Desktop captures are normalised to 16:9 and written at three
 * widths; phone captures keep their own ratio at one width.
 *
 *   public/images/work/<slug>/d<n>.webp       1600 wide
 *   public/images/work/<slug>/d<n>-800.webp    800 wide
 *   public/images/work/<slug>/d1-400.webp      400 wide (list thumbnails)
 *   public/images/work/<slug>/m<n>.webp        560 wide
 */

interface Crop {
  left: number
  top: number
  width: number
  height: number
}

interface Capture {
  file: string
  /** Region to keep before resizing; omitted when the capture is already 16:9. */
  crop?: Crop
}

interface Entry {
  slug: string
  source: string
  desktop: Capture[]
  mobile: Capture[]
}

/** The top 16:9 of a 1600x1280 embed capture. */
const EMBED_TOP: Crop = { left: 0, top: 0, width: 1600, height: 900 }

const ENTRIES: Entry[] = [
  {
    slug: 'radar-legislativo',
    source: 'radar-legislativo',
    desktop: [
      { file: 'desktop/01-voting-detail-ai-summary.png' },
      { file: 'desktop/02-backoffice-ai-review.png' },
      { file: 'desktop/03-deputy-profile.png' },
      { file: 'desktop/05-transparencia.png' },
      { file: 'desktop/07-backoffice-dashboard.png' },
    ],
    mobile: [
      { file: 'mobile/01-voting-detail-ai-summary.png' },
      { file: 'mobile/02-deputy-profile.png' },
      { file: 'mobile/05-transparencia.png' },
    ],
  },
  {
    slug: 'hotmart-bunde',
    source: 'hotmart-bunde',
    desktop: [
      { file: 'desktop/01-hero.png' },
      { file: 'desktop/02-modulos.png' },
      { file: 'desktop/03-sobre.png' },
    ],
    mobile: [{ file: 'mobile/01-hero.png' }, { file: 'mobile/02-sobre.png' }, { file: 'mobile/03-modulos.png' }],
  },
  {
    slug: 'enquetes-gzh',
    source: 'enquetes-gzh',
    desktop: [
      { file: 'desktop/03-backoffice-poll-list.png' },
      { file: 'desktop/02-embed-results.png', crop: EMBED_TOP },
      { file: 'desktop/01-embed-vote.png', crop: EMBED_TOP },
    ],
    mobile: [
      { file: 'mobile/01-embed-vote.png' },
      { file: 'mobile/02-embed-results.png' },
      { file: 'mobile/03-backoffice-poll-list.png' },
    ],
  },
  {
    slug: 'painel-da-reconstrucao',
    source: 'painel-da-reconstrucao',
    desktop: [
      { file: 'desktop/01-dados-gerais.png' },
      { file: 'desktop/02-caminho-dinheiro.png' },
      { file: 'desktop/03-estradas-afetadas.png' },
    ],
    mobile: [
      { file: 'mobile/01-dados-gerais.png' },
      { file: 'mobile/02-caminho-dinheiro.png' },
      { file: 'mobile/03-estradas-afetadas.png' },
    ],
  },
  {
    slug: 'chat-da-hora',
    source: 'chatbot-analitico-redacao',
    // The only capture of this tool is a composed one; its screen area is cut out.
    desktop: [{ file: 'mockups/desktop.webp', crop: { left: 188, top: 50, width: 1618, height: 910 } }],
    mobile: [],
  },
  {
    slug: 'fotos-do-ano-2024',
    source: 'fotos-do-ano-2024',
    desktop: [
      { file: 'desktop/03-beira-rio-aerial.png' },
      { file: 'desktop/02-photographer-section.png' },
      { file: 'desktop/01-hero.png' },
    ],
    mobile: [
      { file: 'mobile/01-hero.png' },
      { file: 'mobile/02-photographer-section.png' },
      { file: 'mobile/03-beira-rio-aerial.png' },
    ],
  },
  {
    slug: 'fotos-do-ano-2025',
    source: 'fotos-do-ano-2025',
    desktop: [
      { file: 'desktop/01-hero.png' },
      { file: 'desktop/03-photographer-feature.png' },
      { file: 'desktop/04-parallax-gallery.png' },
    ],
    mobile: [
      { file: 'mobile/01-hero.png' },
      { file: 'mobile/03-photographer-feature.png' },
      { file: 'mobile/04-parallax-gallery.png' },
    ],
  },
  {
    slug: 'peleia-gre-nal',
    source: 'peleia-gre-nal',
    desktop: [
      { file: 'desktop/01-intro.png' },
      { file: 'desktop/03-team-pick.png' },
      { file: 'desktop/04-combat.png' },
    ],
    mobile: [
      { file: 'mobile/03-team-pick.png' },
      { file: 'mobile/04-combat.png' },
      { file: 'mobile/05-round-result.png' },
    ],
  },
  {
    slug: 'ia-na-redacao',
    source: 'ia-na-redacao',
    desktop: [
      { file: 'desktop/01-landing.png' },
      { file: 'desktop/02-videos.png' },
      { file: 'desktop/03-articles.png' },
    ],
    mobile: [
      { file: 'mobile/01-landing.png' },
      { file: 'mobile/02-videos.png' },
      { file: 'mobile/03-articles.png' },
    ],
  },
]

const SOURCE_ROOT = resolve(process.cwd(), 'public', 'images', 'projects')
const OUTPUT_ROOT = resolve(process.cwd(), 'public', 'images', 'work')

async function write(src: string, crop: Crop | undefined, width: number, out: string, quality: number): Promise<number> {
  let image = sharp(src)
  if (crop) image = image.extract(crop)
  await image.resize({ width, withoutEnlargement: true }).webp({ quality, effort: 6 }).toFile(out)
  return (await stat(out)).size
}

async function main(): Promise<void> {
  let total = 0
  for (const entry of ENTRIES) {
    const outDir = join(OUTPUT_ROOT, entry.slug)
    await mkdir(outDir, { recursive: true })
    for (const [i, capture] of entry.desktop.entries()) {
      const src = join(SOURCE_ROOT, entry.source, capture.file)
      const n = i + 1
      total += await write(src, capture.crop, 1600, join(outDir, `d${n}.webp`), 80)
      total += await write(src, capture.crop, 800, join(outDir, `d${n}-800.webp`), 78)
      if (n === 1) total += await write(src, capture.crop, 400, join(outDir, 'd1-400.webp'), 76)
    }
    for (const [i, capture] of entry.mobile.entries()) {
      const src = join(SOURCE_ROOT, entry.source, capture.file)
      total += await write(src, capture.crop, 560, join(outDir, `m${i + 1}.webp`), 78)
    }
    console.log(`${entry.slug}: ${entry.desktop.length} desktop, ${entry.mobile.length} mobile`)
  }
  console.log(`total ${(total / 1_000_000).toFixed(2)} MB`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
