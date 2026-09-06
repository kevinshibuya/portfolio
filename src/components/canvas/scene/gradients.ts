import * as THREE from 'three'

/**
 * The scene's soft shadow mask, drawn once on a 2D canvas.
 *
 * White-on-transparent: the ALPHA carries the shape and the material's colour
 * supplies the tint, so one texture serves all four cards at four different
 * deep-tint values.
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

/**
 * A card's floor shadow: a blurred rounded rectangle whose alpha is the shadow
 * density. Cheaper than a shadow pass by an entire scene render, and it cannot
 * accidentally cast the title the way a real pass would.
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
