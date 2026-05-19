import sharp from 'sharp'
import { mkdir, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { homedir } from 'node:os'

const SLUGS = [
  'hotmart-bunde',
  'fotos-do-ano-2025',
  'painel-da-reconstrucao',
  'enquetes-gzh',
  'fotos-do-ano-2024',
  'ia-na-redacao',
  'peleia-gre-nal',
  'chatbot-analitico-redacao',
] as const

type Variant = 'desktop' | 'desktop-bento' | 'mobile'

interface VariantSpec {
  kind: 'desktop' | 'mobile'  // which source PNG to read
  outName: string             // filename written under <slug>/mockups/
  maxEdge: number             // sharp resize cap
}

const VARIANTS: Record<Variant, VariantSpec> = {
  // Detail-page hero: target 2000px width. Sources are currently 1024×629
  // — withoutEnlargement keeps output at native resolution; re-export sources
  // at ≥2000px to actually achieve the target.
  'desktop':       { kind: 'desktop', outName: 'desktop.webp',       maxEdge: 2000 },
  // Bento card: small enough that 1200 is plenty.
  'desktop-bento': { kind: 'desktop', outName: 'desktop-bento.webp', maxEdge: 1200 },
  // Mobile mockup: high-res source, 2000px gives crisp detail-page rendering.
  'mobile':        { kind: 'mobile',  outName: 'mobile.webp',        maxEdge: 2000 },
}

const SOURCE_ROOT = resolve(homedir(), 'portfolio-snapshots')
const OUTPUT_ROOT = resolve(process.cwd(), 'public', 'images', 'projects')
const QUALITY = 90

interface Result {
  slug: string
  variant: Variant
  src: string
  out: string
  srcSize: number
  outSize: number
  outWidth: number
  outHeight: number
}

async function optimize(slug: string, variant: Variant): Promise<Result> {
  const spec = VARIANTS[variant]
  const src = join(SOURCE_ROOT, slug, 'mockups', `${spec.kind}.png`)
  const out = join(OUTPUT_ROOT, slug, 'mockups', spec.outName)
  if (!src.startsWith(SOURCE_ROOT + '/')) {
    throw new Error(`Refusing to read outside snapshot root: ${src}`)
  }
  await mkdir(dirname(out), { recursive: true })
  const info = await sharp(src)
    .resize({ width: spec.maxEdge, height: spec.maxEdge, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, alphaQuality: QUALITY })
    .toFile(out)
  const [srcStat, outStat] = await Promise.all([stat(src), stat(out)])
  return {
    slug, variant, src, out,
    srcSize: srcStat.size, outSize: outStat.size,
    outWidth: info.width, outHeight: info.height,
  }
}

function fmt(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' MB'
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + ' KB'
  return bytes + ' B'
}

async function main() {
  const results: Result[] = []
  const failures: { slug: string; variant: Variant; error: unknown }[] = []
  for (const slug of SLUGS) {
    for (const variant of Object.keys(VARIANTS) as Variant[]) {
      try {
        results.push(await optimize(slug, variant))
      } catch (error) {
        failures.push({ slug, variant, error })
      }
    }
  }
  console.log('\nslug                        variant         dims         in        out       ratio')
  console.log('─'.repeat(82))
  for (const r of results) {
    const ratio = ((r.outSize / r.srcSize) * 100).toFixed(1) + '%'
    const dims = `${r.outWidth}×${r.outHeight}`
    console.log(
      `${r.slug.padEnd(28)}${r.variant.padEnd(16)}${dims.padEnd(13)}${fmt(r.srcSize).padEnd(10)}${fmt(r.outSize).padEnd(10)}${ratio}`
    )
  }
  if (failures.length > 0) {
    console.error('\nFailures:')
    for (const f of failures) console.error(`  ${f.slug} ${f.variant}: ${f.error}`)
    process.exit(1)
  }
  console.log(`\n${results.length} files optimized.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
