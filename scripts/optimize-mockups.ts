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
] as const

type Kind = 'desktop' | 'mobile'

const SOURCE_ROOT = resolve(homedir(), 'portfolio-snapshots')
const OUTPUT_ROOT = resolve(process.cwd(), 'public', 'images', 'projects')
const MAX_EDGE = 1600
const QUALITY = 82

interface Result {
  slug: string
  kind: Kind
  src: string
  out: string
  srcSize: number
  outSize: number
}

async function optimize(slug: string, kind: Kind): Promise<Result> {
  const src = join(SOURCE_ROOT, slug, 'mockups', `${kind}.png`)
  const out = join(OUTPUT_ROOT, slug, 'mockups', `${kind}.webp`)
  if (!src.startsWith(SOURCE_ROOT + '/')) {
    throw new Error(`Refusing to read outside snapshot root: ${src}`)
  }
  await mkdir(dirname(out), { recursive: true })
  await sharp(src)
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: QUALITY, alphaQuality: QUALITY })
    .toFile(out)
  const [srcStat, outStat] = await Promise.all([stat(src), stat(out)])
  return { slug, kind, src, out, srcSize: srcStat.size, outSize: outStat.size }
}

function fmt(bytes: number): string {
  if (bytes >= 1_000_000) return (bytes / 1_000_000).toFixed(1) + ' MB'
  if (bytes >= 1_000) return (bytes / 1_000).toFixed(0) + ' KB'
  return bytes + ' B'
}

async function main() {
  const results: Result[] = []
  const failures: { slug: string; kind: Kind; error: unknown }[] = []
  for (const slug of SLUGS) {
    for (const kind of ['desktop', 'mobile'] as const) {
      try {
        results.push(await optimize(slug, kind))
      } catch (error) {
        failures.push({ slug, kind, error })
      }
    }
  }
  console.log('\nslug                        kind     in        out       ratio')
  console.log('─'.repeat(64))
  for (const r of results) {
    const ratio = ((r.outSize / r.srcSize) * 100).toFixed(1) + '%'
    console.log(
      `${r.slug.padEnd(28)}${r.kind.padEnd(9)}${fmt(r.srcSize).padEnd(10)}${fmt(r.outSize).padEnd(10)}${ratio}`
    )
  }
  if (failures.length > 0) {
    console.error('\nFailures:')
    for (const f of failures) console.error(`  ${f.slug} ${f.kind}: ${f.error}`)
    process.exit(1)
  }
  console.log(`\n${results.length} files optimized.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
