export interface WebglProbe {
  supported: boolean
  software: boolean
}

/**
 * Software rasterisers, by the renderer strings they actually report.
 * Deliberately narrow: absence of evidence is treated as hardware, because a
 * wider pattern ('angle', 'mesa', 'google') would silently strip depth of
 * field from real GPUs.
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i

/**
 * One throwaway context answers both questions we have about the GPU:
 * whether WebGL2 exists at all (three r185 has no WebGL1 path), and whether
 * we are on a software rasteriser.
 */
function probeWebgl(): WebglProbe {
  if (typeof document === 'undefined') return { supported: false, software: false }
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return { supported: false, software: false }
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(
      info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    )
    const software = SOFTWARE_RENDERER.test(name)
    // Hand the probe's context straight back; contexts are a scarce resource.
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return { supported: true, software }
  } catch {
    return { supported: false, software: false }
  }
}

let probed: WebglProbe | null = null

/**
 * The probe, run once per page. `Projects` reads it on its first render so the
 * pinned wrapper never mounts where the scene cannot: mounted for even one
 * commit, it publishes a `data-svh` that Home's nav handoff scrolls to, and is
 * gone by the time the scroll lands. The scene reads the same answer, so the
 * page spends one throwaway context, not two.
 */
export function webglProbe(): WebglProbe {
  probed ??= probeWebgl()
  return probed
}
