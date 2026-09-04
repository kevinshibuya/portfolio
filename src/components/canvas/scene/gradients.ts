import * as THREE from 'three'

/**
 * The scene's two soft masks, drawn once on a 2D canvas.
 *
 * Both are white-on-transparent: the ALPHA carries the shape and the material's
 * colour supplies the tint, so one texture serves all four cards at four
 * different tricolor values.
 */

function canvas2d(width: number, height: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D canvas context unavailable for the scene gradients')
  return ctx
}

function finish(ctx: CanvasRenderingContext2D): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(ctx.canvas)
  texture.needsUpdate = true
  return texture
}

/** The tricolor halo behind a card: a soft radial falloff to nothing. */
export function radialGradientTexture(size = 256, inner = 1, outer = 0): THREE.CanvasTexture {
  const ctx = canvas2d(size, size)
  const half = size / 2
  const gradient = ctx.createRadialGradient(half, half, 0, half, half, half)
  gradient.addColorStop(0, `rgba(255,255,255,${inner})`)
  // An eased middle stop keeps the falloff from reading as a hard-edged disc.
  gradient.addColorStop(0.5, `rgba(255,255,255,${inner * 0.35 + outer * 0.65})`)
  gradient.addColorStop(1, `rgba(255,255,255,${outer})`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  return finish(ctx)
}

/**
 * A card's floor shadow: a blurred rounded rectangle whose alpha is the shadow
 * density. Cheaper than a shadow pass by an entire scene render, and it cannot
 * accidentally cast the title or the halos the way a real pass would.
 */
export function roundedBlobTexture(w = 256, h = 192, blurPx = 40): THREE.CanvasTexture {
  const ctx = canvas2d(w, h)
  const inset = blurPx
  const radius = Math.min(48, (Math.min(w, h) - 2 * inset) / 2)
  ctx.filter = `blur(${blurPx / 2}px)`
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(inset, inset, w - 2 * inset, h - 2 * inset, radius)
  ctx.fill()
  ctx.filter = 'none'
  return finish(ctx)
}
