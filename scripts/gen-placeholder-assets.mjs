// Generates clearly-marked PLACEHOLDER assets for the Scene 1 byline.
// Owner deliverables (real portrait + scanned handwriting) replace these at the
// SAME paths — see public/images/README-placeholders.md. Run: node scripts/gen-placeholder-assets.mjs
import sharp from 'sharp'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'public/images')

const W = 1200, H = 1500 // 4:5 portrait

// 1. Source portrait placeholder — flat warm-paper tone with a centered label.
const label = (text, color) => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
     <rect width="100%" height="100%" fill="#c9c4bb"/>
     <text x="50%" y="50%" font-family="monospace" font-size="52"
       fill="${color}" text-anchor="middle" dominant-baseline="middle">${text}</text>
   </svg>`,
)
await sharp(label('PLACEHOLDER PORTRAIT', '#2A4060'))
  .jpeg({ quality: 82 }).toFile(resolve(OUT, 'portrait-placeholder.jpg'))

// 2. Pre-baked duotone fallback — ink/paper two-tone version of the same.
await sharp(label('PLACEHOLDER DUOTONE', '#111822'))
  .tint({ r: 0x88, g: 0x9a, b: 0xb2 })
  .jpeg({ quality: 82 }).toFile(resolve(OUT, 'portrait-duotone-placeholder.jpg'))

// 3. Handwriting margin-note placeholder — transparent PNG with a faint scrawl label.
const note = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200">
     <text x="0" y="70" font-family="cursive" font-size="34" fill="#2A4060"
       opacity="0.7" transform="rotate(-4 0 70)">ship it, then make it sing</text>
     <text x="0" y="120" font-family="monospace" font-size="16" fill="#6A8CAA"
       opacity="0.6">[ placeholder — swap with scanned handwriting ]</text>
   </svg>`,
)
await sharp(note).png().toFile(resolve(OUT, 'margin-note-placeholder.png'))

console.log('placeholder assets written to public/images/')
