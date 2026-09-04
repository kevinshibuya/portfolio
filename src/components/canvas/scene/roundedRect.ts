import * as THREE from 'three'

/**
 * A rounded rectangle centred on the origin, as real geometry.
 *
 * The corners are CUT, not masked: an alpha mask would leave the plane writing
 * depth over its own rounded-off corners, which notches the halo sitting
 * behind the card. Geometry keeps depth honest.
 *
 * ShapeGeometry generates UVs in shape units, so a shape that spans −w/2..w/2
 * would sample the texture at negative coordinates. The UVs are remapped to
 * [0,1] across the rect.
 */
export function roundedRectGeometry(
  w: number,
  h: number,
  r: number,
  segments = 8,
): THREE.BufferGeometry {
  const radius = Math.min(r, w / 2, h / 2)
  const x = -w / 2
  const y = -h / 2
  const right = x + w
  const top = y + h

  const shape = new THREE.Shape()
  shape.moveTo(x + radius, y)
  shape.lineTo(right - radius, y)
  shape.absarc(right - radius, y + radius, radius, -Math.PI / 2, 0, false)
  shape.lineTo(right, top - radius)
  shape.absarc(right - radius, top - radius, radius, 0, Math.PI / 2, false)
  shape.lineTo(x + radius, top)
  shape.absarc(x + radius, top - radius, radius, Math.PI / 2, Math.PI, false)
  shape.lineTo(x, y + radius)
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false)

  const geometry = new THREE.ShapeGeometry(shape, segments)
  const position = geometry.attributes.position
  const uv = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    uv[i * 2] = (position.getX(i) - x) / w
    uv[i * 2 + 1] = (position.getY(i) - y) / h
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}
