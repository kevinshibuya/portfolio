import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { sceneGeometry, titleWrapAllowancePx, SEAM_POWER } from '../../../utils/sceneMotion'
import { drawTitleTexture } from './titleTexture'
import { TITLE_LAYER, type SceneRefs } from './sceneRefs'

/**
 * The coverage cut. With the seam's (1−t)^p + t^p weights summing past 1
 * mid-seam, 0.5 makes the seam a union of the two blurred names: the lump the
 * strokes bridge through.
 */
const THRESHOLD = 0.5
/** A resize alone waits this long before the textures are rebuilt. */
const RESIZE_DEBOUNCE_MS = 150

const vertexShader = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

/**
 * The seam morph. A front sweeps the plane in reading order; each column
 * blends the outgoing name (slot A) into the incoming one (slot B) by its
 * distance to the front, blurring both toward the seam's centre, and the sum
 * is cut at a hard threshold. Inside the seam the outgoing strokes swell into
 * blobs and the incoming ones grow out of them: the gooey bridge, one letter
 * at a time. Two whole names are never summed — that sum is a slab for any
 * two 6–7 em Anton names, whatever the blur or the cut.
 *
 * On the settle plateaus `uSeam` is 0 and the whole draw takes the one-tap
 * path at the rest LOD, which is exactly 0 for the drawn scale. The blur is a
 * 3×3 binomial over the mip whose texel is about sigma wide, which matches a
 * true Gaussian to well under a percent of ink; every tap is masked to the
 * texture, because clamp-to-edge on a coarse mip would smear the edge texel
 * across the plane. `fwidth` widens the cut by exactly one screen pixel so
 * the edge is antialiased without going soft.
 *
 * three declares neither the fragment output nor `gl_FragColor` under GLSL3,
 * but it DOES provide `linearToOutputTexel`, so the output is declared here
 * and the sanctioned colorspace include still applies.
 */
const fragmentShader = /* glsl */ `
  layout(location = 0) out highp vec4 pc_fragColor;
  #define gl_FragColor pc_fragColor

  uniform sampler2D uTexA;
  uniform sampler2D uTexB;
  uniform vec2 uScaleA;
  uniform vec2 uScaleB;
  uniform vec2 uOffsetA;
  uniform vec2 uOffsetB;
  uniform vec2 uTexelA;
  uniform vec2 uTexelB;
  uniform float uBaseLodA;
  uniform float uBaseLodB;
  uniform float uSigmaA;
  uniform float uSigmaB;
  uniform float uPresentA;
  uniform float uPresentB;
  uniform float uSeam;
  uniform float uPlateauT;
  uniform float uFront;
  uniform float uSeamWidth;
  uniform float uPower;
  uniform vec3 uColor;
  uniform float uThreshold;

  in vec2 vUv;

  float tap(sampler2D t, vec2 uv, float lod) {
    vec2 inside = step(vec2(0.0), uv) * step(uv, vec2(1.0));
    return textureLod(t, uv, lod).a * inside.x * inside.y;
  }

  float blurred(sampler2D t, vec2 uv, vec2 texel, float sigma, float baseLod) {
    if (sigma < 0.5) return tap(t, uv, baseLod);
    float lod = max(baseLod, log2(sigma));
    vec2 s = sigma * 1.2247449 * texel;
    float c = tap(t, uv, lod) * 4.0
      + (tap(t, uv + vec2(s.x, 0.0), lod) + tap(t, uv - vec2(s.x, 0.0), lod)
       + tap(t, uv + vec2(0.0, s.y), lod) + tap(t, uv - vec2(0.0, s.y), lod)) * 2.0
      + tap(t, uv + s, lod) + tap(t, uv - s, lod)
      + tap(t, uv + vec2(s.x, -s.y), lod) + tap(t, uv + vec2(-s.x, s.y), lod);
    return c / 16.0;
  }

  void main() {
    vec2 uvA = vUv * uScaleA + uOffsetA;
    vec2 uvB = vUv * uScaleB + uOffsetB;
    float a;
    if (uSeam < 0.5) {
      a = tap(uTexA, uvA, uBaseLodA) * (1.0 - uPlateauT) * uPresentA
        + tap(uTexB, uvB, uBaseLodB) * uPlateauT * uPresentB;
    } else {
      float t = smoothstep(0.0, 1.0, clamp((uFront - vUv.x) / uSeamWidth + 0.5, 0.0, 1.0));
      float wOut = pow(1.0 - t, uPower) * uPresentA;
      float wIn = pow(t, uPower) * uPresentB;
      // A slot with no weight is not sampled: outside the seam the far name
      // would otherwise pay its nine taps for nothing on every fragment.
      a = (wOut > 0.0 ? blurred(uTexA, uvA, uTexelA, uSigmaA * t, uBaseLodA) * wOut : 0.0)
        + (wIn > 0.0 ? blurred(uTexB, uvB, uTexelB, uSigmaB * (1.0 - t), uBaseLodB) * wIn : 0.0);
    }
    float w = fwidth(a) * 0.75;
    float alpha = smoothstep(uThreshold - w, uThreshold + w, a);
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(uColor, alpha);
    #include <colorspace_fragment>
  }
`

interface SceneTitleProps {
  titles: string[]
  reducedMotion: boolean
  sceneRefs: SceneRefs
}

/**
 * The monumental in-scene title. It floats camera-relative in the upper third
 * of the frame and morphs between adjacent project names as the camera travels.
 *
 * Textures are generated in an effect rather than through Suspense on purpose:
 * suspending here would unmount the whole scene for a frame every time the
 * language changes. Until they resolve the plane simply renders nothing.
 *
 * Device pixels, once: each title is rasterised at the em it is DISPLAYED at
 * (`titleCapPx · viewport.dpr · scale`), so at rest the mip LOD is exactly 0
 * and the glyphs are crisp. `scale` is the fit the rig settles on (the width
 * cap and the band under the nav); when that fit moves by more than a percent
 * the rig asks for one redraw at the new scale through `sceneRefs.titleRedraw`.
 *
 * The mesh lives on `TITLE_LAYER`, which the composer never renders: the
 * environment draws it in a pass of its own after the composer, so depth of
 * field and grain never touch it. It carries NO fog either — the title is the
 * one object in the scene the cream fog must not touch.
 */
export function SceneTitle({ titles, reducedMotion, sceneRefs }: SceneTitleProps) {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const dpr = useThree((state) => state.viewport.dpr)
  const size = useThree((state) => state.size)
  const camera = useThree((state) => state.camera)
  const invalidate = useThree((state) => state.invalidate)

  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        vertexShader,
        fragmentShader,
        transparent: true,
        // Depth-tested against the corridor so the settled card still covers
        // any ink that would fall behind it.
        depthWrite: true,
        depthTest: true,
        uniforms: {
          uTexA: { value: null },
          uTexB: { value: null },
          uScaleA: { value: new THREE.Vector2(1, 1) },
          uScaleB: { value: new THREE.Vector2(1, 1) },
          uOffsetA: { value: new THREE.Vector2(0, 0) },
          uOffsetB: { value: new THREE.Vector2(0, 0) },
          uTexelA: { value: new THREE.Vector2(0, 0) },
          uTexelB: { value: new THREE.Vector2(0, 0) },
          uBaseLodA: { value: 0 },
          uBaseLodB: { value: 0 },
          uSigmaA: { value: 0 },
          uSigmaB: { value: 0 },
          uPresentA: { value: 0 },
          uPresentB: { value: 0 },
          uSeam: { value: 0 },
          uPlateauT: { value: 0 },
          uFront: { value: 0 },
          uSeamWidth: { value: 1 },
          uPower: { value: SEAM_POWER },
          uColor: { value: new THREE.Color('#0B0E14') },
          uThreshold: { value: THRESHOLD },
        },
      }),
    [],
  )

  useLayoutEffect(() => {
    sceneRefs.title = groupRef.current
    sceneRefs.titleMaterial = material
    return () => {
      sceneRefs.title = null
      sceneRefs.titleMaterial = null
    }
  }, [sceneRefs, material])

  // Layers do not inherit, so the MESH takes the layer; the camera must be
  // able to see it in the main pass when there is no composer (phones).
  useLayoutEffect(() => {
    meshRef.current?.layers.set(TITLE_LAYER)
  }, [])
  useLayoutEffect(() => {
    camera.layers.enable(TITLE_LAYER)
    return () => camera.layers.disable(TITLE_LAYER)
  }, [camera])

  // Redraw on a language switch. `titles` is a fresh array every render, so the
  // join is what actually decides whether the work needs doing again.
  const titlesKey = titles.join('\u0000')
  const latestTitles = useRef(titles)
  latestTitles.current = titles

  // The fit the textures are drawn for. The rig owns the number; this only
  // remembers it and redraws when asked.
  const scaleRef = useRef(1)
  const generation = useRef(0)
  const redrawRef = useRef<() => void>(() => {})

  useLayoutEffect(() => {
    sceneRefs.titleRedraw = (scale: number) => {
      if (Math.abs(scale - scaleRef.current) < 1e-6) return
      scaleRef.current = scale
      redrawRef.current()
    }
    return () => {
      sceneRefs.titleRedraw = null
    }
  }, [sceneRefs])

  const drawnKey = useRef('')
  const drawKey = `${titlesKey}\u0001${dpr}`

  useEffect(() => {
    let timer: number | undefined
    // The ref object itself, so the cleanup can retire in-flight draws.
    const draws = generation

    const draw = async (): Promise<void> => {
      const id = ++draws.current
      const g = sceneGeometry(Math.max(size.width, 1), Math.max(size.height, 1))
      const scale = scaleRef.current
      const fontPx = g.titleCapPx * dpr * scale
      // The wrap threshold is the FRAME, and it scales with `scale`. Two things
      // are load-bearing here:
      //
      // `* scale` closes a feedback loop. The lines are measured at
      // `fontPx = titleCapPx · dpr · scale`, so without it the allowance and the
      // measurement disagree: the fit decides the wrap and the wrap decides the
      // fit, and one viewport gets two stable answers depending on how it was
      // reached. Coming down from a desktop width a phone locked onto the
      // degenerate one — "painel da reconstrução" on ONE line at fit 0.531
      // (cap 33 px) where a fresh load gives two lines at 0.899 (cap 56 px).
      //
      // The allowance is the whole frame, NOT `titleWidthCap`. The width cap
      // governs the rendered size (the rig's `fit` enforces it); this decides
      // only whether a name is too long to stand on one line at all. Capping it
      // here as well makes every desktop title wrap and, because the band shrink
      // is shared across all four, shrinks the lot: cap/card 0.167 → 0.131 at
      // 1440. Wrap when a line would overflow the frame; shrink otherwise.
      const maxLinePx = titleWrapAllowancePx(g, dpr, scale)
      const drawn = await Promise.all(
        latestTitles.current.map((text) => drawTitleTexture(text, { maxLinePx, fontPx })),
      )
      if (id !== draws.current) {
        for (const d of drawn) d.texture.dispose()
        return
      }
      for (const old of sceneRefs.titleTextures) old.dispose()
      sceneRefs.titleTextures = drawn.map((d) => d.texture)
      sceneRefs.titleMetrics = drawn.map(
        ({ widthPx, heightPx, lineCount, capPx, emPx, inkTopPx, inkBottomPx, baselinePx }) => ({
          widthPx,
          heightPx,
          lineCount,
          capPx,
          emPx,
          inkTopPx,
          inkBottomPx,
          baselinePx,
          drawnScale: scale,
        }),
      )
      invalidate() // reduced motion renders on demand; the redraw needs a frame
    }
    redrawRef.current = () => void draw()

    if (drawnKey.current !== drawKey) {
      drawnKey.current = drawKey
      void draw()
    } else {
      timer = window.setTimeout(() => void draw(), RESIZE_DEBOUNCE_MS)
    }
    return () => {
      draws.current++
      if (timer) window.clearTimeout(timer)
    }
  }, [drawKey, dpr, size.width, size.height, sceneRefs, invalidate])

  useEffect(
    () => () => {
      for (const texture of sceneRefs.titleTextures) texture.dispose()
      sceneRefs.titleTextures = []
      sceneRefs.titleMetrics = []
      geometry.dispose()
      material.dispose()
    },
    [geometry, material, sceneRefs],
  )

  // Reduced motion still shows a title; it just never morphs or floats.
  void reducedMotion

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef} geometry={geometry} material={material} renderOrder={10} />
    </group>
  )
}
