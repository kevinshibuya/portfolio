import * as THREE from 'three'
import type { ArchiveItem } from '../../../types/content'
import {
  FRIEZE_CELL_H,
  FRIEZE_CELL_W,
  type Cell,
  type FriezeBlockExtent,
  type FriezeLayout,
} from '../../../utils/friezeLayout'
import { accentDeepLargeFor } from '../../../utils/palette'
import type { FriezePanel, FriezeTexture } from './friezeTexture'

/**
 * The wall's colour: one lookup texture per year block, one shader per panel.
 *
 * The masks carry coverage only (R title, G meta and serial), so every colour
 * decision lives here. A block's lookup is a columns×rows RGBA8 texture — one
 * texel per slot, the piece's origin ink in sRGB, alpha 0 on a hole — sampled
 * NEAREST, so a fragment's title ink is its own cell's ink with no bleed and no
 * per-cell uniform. Hover recolours through uniforms alone: the lookup is
 * never rewritten, so a pointer move costs no upload.
 */

/**
 * Origin inks, fixed per origin — NOT `accentDeepFor`'s index rotation. A
 * piece's colour has to mean the same thing everywhere on the wall, so the
 * mapping is by origin, and the hover tint is what rotates.
 */
export const ORIGIN_INK: Record<ArchiveItem['origin'], string> = {
  professional: '#0B0E14',
  freelance: '#B22B47',
  personal: '#2A54B5',
}

/** The wall's ground, the site's cream. */
const CREAM = '#F5F2EC'
/**
 * `rgba(11,14,20,.62)` composited on cream — the DOM's own result for muted
 * text, resolved once here because the shader has no alpha to blend with.
 */
const META_INK = '#646566'

const hexBytes = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
]

/**
 * One block's slot→ink texture. Row 0 is the wall's TOP (`flipY = false`), the
 * same frame the masks are packed in, and a 2×2 case study writes its ink into
 * all four of its slots so the hover footprint reads uniformly.
 */
export function createFriezeLookup(
  layout: FriezeLayout,
  items: readonly ArchiveItem[],
  blockIndex: number,
  rows: number,
): THREE.DataTexture {
  const block = layout.blocks[blockIndex]
  if (!block) throw new Error(`frieze lookup: no block ${blockIndex}`)
  const origins = new Map(items.map((item) => [item.id, item.origin]))
  const data = new Uint8Array(block.columns * rows * 4)

  for (const cell of layout.cells) {
    if (cell.block !== blockIndex) continue
    const origin = origins.get(cell.itemId)
    if (!origin) throw new Error(`frieze cell ${cell.itemId} has no archive item`)
    const [r, g, b] = hexBytes(ORIGIN_INK[origin])
    const col = cell.col - block.startCol
    for (let x = 0; x < cell.span; x++) {
      for (let y = 0; y < cell.span; y++) {
        const i = ((cell.row + y) * block.columns + col + x) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }
  }

  const texture = new THREE.DataTexture(data, block.columns, rows, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.generateMipmaps = false
  texture.unpackAlignment = 1
  texture.flipY = false
  texture.needsUpdate = true
  return texture
}

/** One lookup per year block, in block order. */
export function createFriezeLookups(
  layout: FriezeLayout,
  items: readonly ArchiveItem[],
  rows: number,
): THREE.DataTexture[] {
  return layout.blocks.map((_, index) => createFriezeLookup(layout, items, index, rows))
}

/** Disposes a set of lookups; safe to call on a partially built list. */
export function disposeFriezeLookups(lookups: readonly THREE.DataTexture[]): void {
  for (const lookup of lookups) lookup.dispose()
}

const VERTEX_SHADER = /* glsl */ `
out vec2 vUv;

#include <common>
#include <fog_pars_vertex>

void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  #include <fog_vertex>
  gl_Position = projectionMatrix * mvPosition;
}
`

/**
 * GLSL3 declares its own output: three only defines `gl_FragColor` for GLSL1
 * shaders, and both `colorspace_fragment` and `fog_fragment` write to it.
 */
const FRAGMENT_SHADER = /* glsl */ `
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor

in vec2 vUv;

uniform sampler2D uMask;
uniform float uMaskPresent;
uniform sampler2D uLookup;
uniform vec2 uLookupSize;
uniform float uPanelOffset;
uniform float uPanelColumns;
uniform vec2 uHoverSlot;
uniform float uHoverSpan;
uniform vec3 uHoverColor;
uniform vec3 uCream;
uniform vec3 uMetaInk;

#include <common>
#include <fog_pars_fragment>

void main() {
  // Both the mask and the lookup are packed top-down (row 0 is the wall's top,
  // flipY false), so every sample flips the raycast's upward v.
  vec2 maskUv = vec2(vUv.x, 1.0 - vUv.y);
  float title = uMaskPresent * texture(uMask, maskUv).r;
  float meta = uMaskPresent * texture(uMask, maskUv).g;

  vec2 slot = vec2(floor(vUv.x * uPanelColumns) + uPanelOffset, floor(maskUv.y * uLookupSize.y));
  vec3 ink = texture(uLookup, (slot + 0.5) / uLookupSize).rgb;

  bool hovered = uHoverSlot.x >= 0.0
    && slot.x >= uHoverSlot.x && slot.x < uHoverSlot.x + uHoverSpan
    && slot.y >= uHoverSlot.y && slot.y < uHoverSlot.y + uHoverSpan;
  if (hovered) ink = uHoverColor;

  vec3 ground = mix(uCream, ink, title);
  ground = mix(ground, uMetaInk, meta);
  gl_FragColor = vec4(ground, 1.0);

  #include <colorspace_fragment>
  #include <fog_fragment>
}
`

/**
 * One panel's material. Opaque and depth-written: the wall is the back of the
 * scene, and fog is on so it recedes with everything else.
 */
export function createFriezeMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    fog: true,
    transparent: false,
    depthWrite: true,
    depthTest: true,
    uniforms: {
      uMask: { value: null },
      uMaskPresent: { value: 0 },
      uLookup: { value: null },
      uLookupSize: { value: new THREE.Vector2(1, 1) },
      uPanelOffset: { value: 0 },
      uPanelColumns: { value: 1 },
      uHoverSlot: { value: new THREE.Vector2(-1, -1) },
      uHoverSpan: { value: 1 },
      uHoverColor: { value: new THREE.Color(ORIGIN_INK.professional) },
      uCream: { value: new THREE.Color(CREAM) },
      uMetaInk: { value: new THREE.Color(META_INK) },
    },
  })
}

export interface FriezePanelBinding {
  /** The panel's coverage mask, or null while the raster is still running. */
  mask: THREE.Texture | null
  lookup: THREE.Texture
  panel: FriezePanel
  block: FriezeBlockExtent
  rows: number
}

/** Points a material at the panel it draws. Uniform writes only, no rebuild. */
export function applyFriezePanel(
  material: THREE.ShaderMaterial,
  { mask, lookup, panel, block, rows }: FriezePanelBinding,
): void {
  const { uniforms } = material
  uniforms.uMask.value = mask
  uniforms.uMaskPresent.value = mask ? 1 : 0
  uniforms.uLookup.value = lookup
  ;(uniforms.uLookupSize.value as THREE.Vector2).set(block.columns, rows)
  uniforms.uPanelOffset.value = panel.startCol - block.startCol
  uniforms.uPanelColumns.value = panel.columns
}

/** The hover tint for the archive item at `index`, the deep-large rotation. */
export function hoverColorFor(index: number): string {
  return accentDeepLargeFor(index)
}

/**
 * Writes the hovered footprint into the panel's uniforms. The lookup texture is
 * never touched, so hovering costs no upload — the tests assert its `version`
 * is unchanged.
 */
export function setFriezeHover(
  material: THREE.ShaderMaterial,
  cell: Cell | null,
  block: FriezeBlockExtent,
  color: string | null,
): void {
  const { uniforms } = material
  const slot = uniforms.uHoverSlot.value as THREE.Vector2
  if (!cell) {
    slot.set(-1, -1)
    uniforms.uHoverSpan.value = 1
    return
  }
  slot.set(cell.col - block.startCol, cell.row)
  uniforms.uHoverSpan.value = cell.span
  if (color) (uniforms.uHoverColor.value as THREE.Color).set(color)
}

export interface FriezePanelMesh {
  panel: FriezePanel
  /** Centre in the wall frame, whose origin is the frieze's top-left corner. */
  centre: [number, number, number]
  size: [number, number]
  /** Null until the raster delivers this panel; the wall renders cream first. */
  mask: FriezeTexture | null
}

/**
 * One mesh per mask panel — five today, because the 2024 block splits at the
 * 4096 px cap. Before the raster lands there are no panels to follow, so the
 * wall falls back to one cream mesh per block, which takes no hits.
 */
export function panelMeshes(
  layout: FriezeLayout,
  rows: number,
  masks: readonly FriezeTexture[] | null,
): FriezePanelMesh[] {
  const place = (panel: FriezePanel, mask: FriezeTexture | null): FriezePanelMesh => ({
    panel,
    centre: [
      (panel.startCol + panel.columns / 2) * FRIEZE_CELL_W,
      (-rows * FRIEZE_CELL_H) / 2,
      0,
    ],
    size: [panel.columns * FRIEZE_CELL_W, rows * FRIEZE_CELL_H],
    mask,
  })
  if (masks) return masks.map((mask) => place(mask.panel, mask))
  return layout.blocks.map((block, index) =>
    place({ block: index, panel: 0, startCol: block.startCol, columns: block.columns }, null),
  )
}
