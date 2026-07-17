import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend, type ThreeElement } from '@react-three/fiber'
import { rosetteAnglesRad } from './halftoneMath'

/**
 * Uniform contract for the shared rosette halftone material. LOCKED — a later
 * plan (the goes-to-press wipe, mode 1) depends on these names/types verbatim.
 * The portrait consumer (mode 0) sets uSource/uResolution/uFrequency; the wipe
 * consumer (mode 1) sets uCoverage/uRegister. `uMode` is a FLOAT (branched with
 * `uMode < 0.5` in GLSL) — three.js int-uniform coercion is a known drei footgun.
 */
export interface HalftoneUniformValues {
  uSource: THREE.Texture | null // sampled image (portrait) or render target
  uResolution: THREE.Vector2 // px size of the drawn quad (aspect-correct dot grid)
  uFrequency: number // dots across the shorter axis (coarse≈8 → fine≈120)
  uAngles: THREE.Vector4 // per-channel screen angles (rad): x=C y=M z=Y w=K
  uRegister: THREE.Vector4 // per-channel registration offset in px; (0,0,0,0)=locked
  uInkDark: THREE.Color // duotone ink (default #111822)
  uInkLight: THREE.Color // duotone paper (default #F7F5F1)
  uMode: number // 0 = duotone develop, 1 = cmyk register-lock wipe
  uCoverage: number // wipe ink coverage 0..1 (mode 1 only; mode 0 ignores)
  uDpr: number // capped DPR baked into dot math
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */ `
  uniform sampler2D uSource;
  uniform vec2 uResolution;
  uniform float uFrequency;
  uniform vec4 uAngles;
  uniform vec4 uRegister;
  uniform vec3 uInkDark;
  uniform vec3 uInkLight;
  uniform float uMode;
  uniform float uCoverage;
  uniform float uDpr;

  varying vec2 vUv;

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  // AM (amplitude-modulated) coverage for ONE rotated halftone screen.
  //  uvA    aspect-corrected UV (isotropic units → round dots)
  //  minRes shorter axis of the quad, in CSS px (px→uv conversion + AA scale)
  //  cells  dots across the shorter axis (uFrequency)
  //  angle  screen rotation (rad)
  //  ink    desired ink density 0..1 (drives dot radius; area-linear via sqrt)
  //  regPx  registration offset for this channel, in px (0 = locked)
  // No loops: fully bounded for low-end GPUs.
  float screenCoverage(vec2 uvA, float minRes, float cells, float angle, float ink, float regPx) {
    vec2 p = uvA + vec2(regPx) / minRes;                    // registration shift (px → uv)
    float s = sin(angle);
    float c = cos(angle);
    vec2 rp = vec2(p.x * c - p.y * s, p.x * s + p.y * c);   // rotate into the screen frame
    vec2 cell = fract(rp * cells) - 0.5;                    // local cell coords [-0.5, 0.5]
    float dist = length(cell);                              // 0 center → ~0.707 corner
    float radius = sqrt(clamp(ink, 0.0, 1.0)) * 0.78;       // dot grows; fills corners at ink=1
    float aa = clamp(cells / (minRes * max(uDpr, 1.0)), 0.004, 0.4); // ~1 physical px, dpr-aware
    float cov = 1.0 - smoothstep(radius - aa, radius + aa, dist);
    return cov * smoothstep(0.0, 0.02, ink);               // suppress the center speck at ink≈0
  }

  void main() {
    float minRes = max(min(uResolution.x, uResolution.y), 1.0);
    vec2 uvA = vUv * (uResolution / minRes);                // aspect-correct → isotropic dot grid

    if (uMode < 0.5) {
      // ── MODE 0: duotone develop ─────────────────────────────────────────────
      // Two inks only, a single luminance-driven screen at the K angle.
      // uFrequency is the develop control (coarse ≈ undeveloped → fine ≈ developed).
      vec4 texel = texture2D(uSource, vUv);
      // A null / not-yet-loaded uSource binds three's 1x1 empty texture = (0,0,0,0):
      // alpha 0 ⇒ flat paper fill (never NaN, never a black frame). Opaque art = alpha 1.
      if (texel.a < 0.5) {
        gl_FragColor = vec4(uInkLight, 1.0);
        return;
      }
      float ink = 1.0 - luma(texel.rgb);                    // darker tone ⇒ more ink
      float cov = screenCoverage(uvA, minRes, uFrequency, uAngles.w, ink, 0.0);
      gl_FragColor = vec4(mix(uInkLight, uInkDark, cov), 1.0);
      return;
    }

    // ── MODE 1: CMYK register-lock wipe ───────────────────────────────────────
    // Four screens at the C/M/Y/K angles, each shifted by its uRegister component
    // (visible misregistration → colour fringes) that lock as uRegister → 0.
    // uCoverage grows every dot 0→1 until the plate reads as solid ink.
    float cCov = screenCoverage(uvA, minRes, uFrequency, uAngles.x, uCoverage, uRegister.x);
    float mCov = screenCoverage(uvA, minRes, uFrequency, uAngles.y, uCoverage, uRegister.y);
    float yCov = screenCoverage(uvA, minRes, uFrequency, uAngles.z, uCoverage, uRegister.z);
    float kCov = screenCoverage(uvA, minRes, uFrequency, uAngles.w, uCoverage, uRegister.w);

    vec3 col = uInkLight;                                   // paper
    col *= vec3(1.0 - cCov, 1.0, 1.0);                      // cyan absorbs red
    col *= vec3(1.0, 1.0 - mCov, 1.0);                      // magenta absorbs green
    col *= vec3(1.0, 1.0, 1.0 - yCov);                      // yellow absorbs blue
    col = mix(col, uInkDark, kCov);                         // key (black) locks to the duotone ink
    gl_FragColor = vec4(col, 1.0);
  }
`

/**
 * drei `shaderMaterial`. Registered via `extend({ HalftoneMaterial })`, so
 * `<halftoneMaterial ref={…} />` is usable inside an R3F `<Canvas>`. Defaults:
 * uMode=0, uFrequency=8, uAngles=rosetteAnglesRad(), uRegister=(0,0,0,0),
 * uInkDark=#111822, uInkLight=#F7F5F1, uCoverage=0, uDpr=1, uResolution=(1,1),
 * uSource=null.
 */
export const HalftoneMaterial = shaderMaterial(
  {
    uSource: null,
    uResolution: new THREE.Vector2(1, 1),
    uFrequency: 8,
    uAngles: new THREE.Vector4(...rosetteAnglesRad()),
    uRegister: new THREE.Vector4(0, 0, 0, 0),
    uInkDark: new THREE.Color('#111822'),
    uInkLight: new THREE.Color('#F7F5F1'),
    uMode: 0,
    uCoverage: 0,
    uDpr: 1,
  },
  vertexShader,
  fragmentShader,
)

extend({ HalftoneMaterial })

declare module '@react-three/fiber' {
  interface ThreeElements {
    halftoneMaterial: ThreeElement<typeof HalftoneMaterial>
  }
}
