import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import type { ArchiveItem } from '../../src/types/content'
import { FRIEZE_CELL_H, FRIEZE_CELL_W, FRIEZE_ROWS, friezeLayout } from '../../src/utils/friezeLayout'
import { archive } from '../../src/data/archive'
import { ACCENTS_DEEP_LARGE } from '../../src/utils/palette'
import {
  maskSize,
  panelsFor,
  type FriezePanel,
  type FriezeTexture,
} from '../../src/components/canvas/scene/friezeTexture'
import {
  ORIGIN_INK,
  applyFriezePanel,
  createFriezeLookup,
  createFriezeLookups,
  createFriezeMaterial,
  hoverColorFor,
  panelKey,
  panelMeshes,
  setFriezeHover,
} from '../../src/components/canvas/scene/friezeMaterial'

function piece(id: string, year: number, origin: ArchiveItem['origin'], project = false): ArchiveItem {
  return {
    id,
    title: id,
    origin,
    caseStudy: project ? { slug: id } : undefined,
    date: '01/01/2000',
    sortDate: Date.UTC(2000, 0, 1),
    year,
    href: '#',
    internal: project,
    serial: 1,
  }
}

const items = [
  piece('featured-a', 2025, 'freelance', true),
  piece('editorial-0', 2025, 'professional'),
  piece('editorial-1', 2025, 'personal'),
  piece('editorial-2', 2024, 'professional'),
]
const layout = friezeLayout(items, FRIEZE_ROWS)

function rgba(texture: THREE.DataTexture, col: number, row: number): [number, number, number, number] {
  const data = texture.image.data as Uint8Array
  const i = (row * texture.image.width + col) * 4
  return [data[i], data[i + 1], data[i + 2], data[i + 3]]
}

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
]

describe('ORIGIN_INK', () => {
  it('is the fixed origin mapping, not the index rotation', () => {
    expect(ORIGIN_INK).toEqual({ professional: '#0B0E14', freelance: '#B22B47', personal: '#2A54B5' })
  })
})

describe('createFriezeLookup', () => {
  const lookup = createFriezeLookup(layout, items, 0, FRIEZE_ROWS)

  it('is a nearest, unmipped, sRGB RGBA8 texture of the block grid, row 0 at the top', () => {
    expect(lookup).toBeInstanceOf(THREE.DataTexture)
    expect(lookup.image.width).toBe(layout.blocks[0].columns)
    expect(lookup.image.height).toBe(FRIEZE_ROWS)
    expect(lookup.format).toBe(THREE.RGBAFormat)
    expect(lookup.type).toBe(THREE.UnsignedByteType)
    expect(lookup.colorSpace).toBe(THREE.SRGBColorSpace)
    expect(lookup.minFilter).toBe(THREE.NearestFilter)
    expect(lookup.magFilter).toBe(THREE.NearestFilter)
    expect(lookup.generateMipmaps).toBe(false)
    expect(lookup.unpackAlignment).toBe(1)
    expect(lookup.flipY).toBe(false)
    expect((lookup.image.data as Uint8Array).length).toBe(layout.blocks[0].columns * FRIEZE_ROWS * 4)
  })

  it('repeats a Project across its four slots and colours every origin by its fixed ink', () => {
    for (const [col, row] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      expect(rgba(lookup, col, row)).toEqual([...hex('#B22B47'), 255])
    }
    const e0 = layout.cells.find((c) => c.itemId === 'editorial-0')!
    const e1 = layout.cells.find((c) => c.itemId === 'editorial-1')!
    expect(rgba(lookup, e0.col, e0.row)).toEqual([...hex('#0B0E14'), 255])
    expect(rgba(lookup, e1.col, e1.row)).toEqual([...hex('#2A54B5'), 255])
  })

  it('leaves holes transparent so the shader treats them as blank wall', () => {
    expect(rgba(lookup, 1, 5)).toEqual([0, 0, 0, 0])
  })

  it('uses block-relative columns for a block that does not start at zero', () => {
    const second = createFriezeLookup(layout, items, 1, FRIEZE_ROWS)
    expect(second.image.width).toBe(layout.blocks[1].columns)
    expect(rgba(second, 0, 0)).toEqual([...hex('#0B0E14'), 255])
  })

  it('creates exactly one lookup per block for the whole archive', () => {
    const packed = friezeLayout(archive, FRIEZE_ROWS)
    const lookups = createFriezeLookups(packed, archive, FRIEZE_ROWS)
    expect(lookups).toHaveLength(4)
    expect(lookups.map((l) => l.image.width)).toEqual(packed.blocks.map((b) => b.columns))
    const bytes = lookups.reduce((sum, l) => sum + (l.image.data as Uint8Array).length, 0)
    expect(bytes).toBe(35 * 6 * 4)
    for (const l of lookups) l.dispose()
  })
})

describe('createFriezeMaterial', () => {
  const material = createFriezeMaterial()

  it('carries its own copy of three fog uniforms, or every frame throws', () => {
    // `fog: true` plus the fog chunks makes three call `refreshFogUniforms` on
    // this material on every draw, and a ShaderMaterial does not inherit them:
    // without these the renderer threw inside its own render loop, on a
    // surface no DOM assertion can see.
    for (const name of Object.keys(THREE.UniformsLib.fog)) {
      expect(material.uniforms, name).toHaveProperty(name)
    }
    // Cloned per material: three writes the scene's fog into these, so sharing
    // them would let one panel's fog state overwrite another's.
    const other = createFriezeMaterial()
    expect(material.uniforms.fogColor).not.toBe(other.uniforms.fogColor)
    expect(material.uniforms.fogColor).not.toBe(THREE.UniformsLib.fog.fogColor)
    other.dispose()
  })

  it('is an opaque, fogged, depth-tested GLSL3 shader with the sanctioned colour conversion', () => {
    expect(material).toBeInstanceOf(THREE.ShaderMaterial)
    expect(material.glslVersion).toBe(THREE.GLSL3)
    expect(material.fog).toBe(true)
    expect(material.transparent).toBe(false)
    expect(material.depthWrite).toBe(true)
    expect(material.depthTest).toBe(true)
    expect(material.vertexShader).toContain('#include <fog_vertex>')
    expect(material.fragmentShader).toContain('#include <fog_fragment>')
    expect(material.fragmentShader).toContain('#include <colorspace_fragment>')
  })

  it('flips the canvas frame explicitly and reads title from R and meta from G', () => {
    const src = material.fragmentShader
    expect(src).toContain('1.0 - vUv.y')
    expect(src).toMatch(/texture\(uMask, [^;]*\)\.r/)
    expect(src).toMatch(/texture\(uMask, [^;]*\)\.g/)
    expect(src).not.toMatch(/uMask[^;]*\.b/)
  })

  it('carries the cream ground and the muted meta ink as linear colours', () => {
    const cream = material.uniforms.uCream.value as THREE.Color
    const meta = material.uniforms.uMetaInk.value as THREE.Color
    expect(cream.getHexString().toUpperCase()).toBe('F5F2EC')
    // rgba(11,14,20,.62) composited on cream, the DOM's own result.
    expect(meta.getHexString().toUpperCase()).toBe('646566')
    // Linear working values, not the sRGB bytes.
    expect(cream.r).toBeLessThan(1)
    expect(cream.r).toBeGreaterThan(0.9)
  })
})

describe('applyFriezePanel', () => {
  it('points the panel at its mask, lookup and column offset', () => {
    const material = createFriezeMaterial()
    const lookup = createFriezeLookup(layout, items, 0, FRIEZE_ROWS)
    const mask = new THREE.DataTexture(new Uint8Array(2 * 2 * 2), 2, 2, THREE.RGFormat, THREE.UnsignedByteType)
    const panel: FriezePanel = { block: 0, panel: 1, startCol: 1, columns: 1 }
    applyFriezePanel(material, { mask, lookup, panel, block: layout.blocks[0], rows: FRIEZE_ROWS })
    expect(material.uniforms.uMask.value).toBe(mask)
    expect(material.uniforms.uLookup.value).toBe(lookup)
    expect((material.uniforms.uLookupSize.value as THREE.Vector2).toArray()).toEqual([layout.blocks[0].columns, FRIEZE_ROWS])
    expect(material.uniforms.uPanelOffset.value).toBe(1)
    expect(material.uniforms.uPanelColumns.value).toBe(1)
    expect(material.uniforms.uMaskPresent.value).toBe(1)
    applyFriezePanel(material, { mask: null, lookup, panel, block: layout.blocks[0], rows: FRIEZE_ROWS })
    expect(material.uniforms.uMask.value).toBeNull()
    expect(material.uniforms.uMaskPresent.value).toBe(0)
    // The offset is BLOCK-relative: block 0 starts at the wall's edge, so only
    // a later block separates `panel.startCol` from the shader's column.
    const later = layout.blocks[1]
    expect(later.startCol).toBeGreaterThan(0)
    const wholeLater: FriezePanel = { block: 1, panel: 0, startCol: later.startCol, columns: later.columns }
    applyFriezePanel(material, { mask, lookup, panel: wholeLater, block: later, rows: FRIEZE_ROWS })
    expect(material.uniforms.uPanelOffset.value).toBe(0)
  })
})

describe('setFriezeHover', () => {
  it('writes the hovered footprint and colour through uniforms without touching textures', () => {
    const material = createFriezeMaterial()
    const lookup = createFriezeLookup(layout, items, 0, FRIEZE_ROWS)
    const panel: FriezePanel = { block: 0, panel: 0, startCol: 0, columns: layout.blocks[0].columns }
    applyFriezePanel(material, { mask: null, lookup, panel, block: layout.blocks[0], rows: FRIEZE_ROWS })
    const version = lookup.version
    const cell = layout.cells.find((c) => c.itemId === 'featured-a')!
    for (let i = 0; i < 3; i++) {
      setFriezeHover(material, cell, layout.blocks[0], hoverColorFor(i))
      const slot = material.uniforms.uHoverSlot.value as THREE.Vector2
      expect(slot.toArray()).toEqual([cell.col - layout.blocks[0].startCol, cell.row])
      expect(material.uniforms.uHoverSpan.value).toBe(2)
      const color = material.uniforms.uHoverColor.value as THREE.Color
      expect(`#${color.getHexString().toUpperCase()}`).toBe(ACCENTS_DEEP_LARGE[i])
    }
    expect(lookup.version).toBe(version)
    setFriezeHover(material, null, layout.blocks[0], null)
    expect((material.uniforms.uHoverSlot.value as THREE.Vector2).toArray()).toEqual([-1, -1])
  })

  it('rotates the hover colour through all three deep-large accents', () => {
    expect([0, 1, 2].map(hoverColorFor)).toEqual([...ACCENTS_DEEP_LARGE])
    expect(hoverColorFor(3)).toBe(ACCENTS_DEEP_LARGE[0])
  })
})

describe('panelMeshes', () => {
  const packed = friezeLayout(archive, FRIEZE_ROWS)

  function fakeMasks(density: number): FriezeTexture[] {
    return packed.blocks.flatMap((block, index) =>
      panelsFor({ ...block, index }, packed.cells, density).map((panel) => {
        const size = maskSize(panel.columns, FRIEZE_ROWS, density)
        return {
          texture: new THREE.DataTexture(new Uint8Array(2), 1, 1, THREE.RGFormat, THREE.UnsignedByteType),
          panel,
          widthPx: size.widthPx,
          heightPx: size.heightPx,
          texelsPerWorld: size.texelsPerWorld,
          bytes: size.widthPx * size.heightPx * 2,
          overlapTexels: 0,
          recipe: { layout: packed, rows: FRIEZE_ROWS, items: archive, lang: 'en', density },
        }
      }),
    )
  }

  it('is one mesh per panel, five today, placed in the wall frame from its top-left', () => {
    const masks = fakeMasks(432)
    const meshes = panelMeshes(packed, FRIEZE_ROWS, masks, 432)
    expect(masks).toHaveLength(5)
    expect(meshes).toHaveLength(5)
    for (const [i, mesh] of meshes.entries()) {
      const { startCol, columns } = masks[i].panel
      expect(mesh.mask).toBe(masks[i])
      expect(mesh.centre).toEqual([(startCol + columns / 2) * FRIEZE_CELL_W, (-FRIEZE_ROWS * FRIEZE_CELL_H) / 2, 0])
      expect(mesh.size).toEqual([columns * FRIEZE_CELL_W, FRIEZE_ROWS * FRIEZE_CELL_H])
    }
    // Contiguous, covering the whole extent once.
    expect(meshes.reduce((sum, m) => sum + m.panel.columns, 0)).toBe(packed.columns)
  })

  it('is one cream mesh per PANEL before the masks land, the same panels the masks will use', () => {
    // The warm-up compiles the cream wall's materials, and three's compileAsync
    // polls them by identity; a swap that rebuilt them would dispose the ones
    // being polled and hang the warm-up. Same panels, same materials.
    const cream = panelMeshes(packed, FRIEZE_ROWS, null, 432)
    const drawn = panelMeshes(packed, FRIEZE_ROWS, fakeMasks(432), 432)
    expect(cream).toHaveLength(5)
    expect(cream.every((m) => m.mask === null)).toBe(true)
    expect(cream.map((m) => m.panel)).toEqual(drawn.map((m) => m.panel))
    expect(cream.map((m) => m.centre)).toEqual(drawn.map((m) => m.centre))
    expect(cream.map((m) => m.size)).toEqual(drawn.map((m) => m.size))
  })

  it('keys the materials by panel plan, so a mask swap keeps them and a new split replaces them', () => {
    const cream = panelKey(panelMeshes(packed, FRIEZE_ROWS, null, 432))
    const drawn = panelKey(panelMeshes(packed, FRIEZE_ROWS, fakeMasks(432), 432))
    expect(cream).toBe(drawn)
    expect(cream.split('|')).toHaveLength(5)
    // At a density where nothing splits, 2024 is one panel: a different plan.
    const single = panelKey(panelMeshes(packed, FRIEZE_ROWS, null, 1))
    expect(single.split('|')).toHaveLength(4)
    expect(single).not.toBe(cream)
    // Old masks keep their own topology until the replacement generation lands.
    expect(panelKey(panelMeshes(packed, FRIEZE_ROWS, fakeMasks(432), 1))).toBe(cream)
  })
})
