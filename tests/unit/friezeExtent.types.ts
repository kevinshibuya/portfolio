/// <reference types="vite/client" />

import { archive } from '../../src/data/archive'
import { FRIEZE_ROWS, friezeExtent, friezeLayout, type FriezeExtent } from '../../src/utils/friezeLayout'
import { friezeFrame, sceneGeometry } from '../../src/utils/sceneMotion'

// Motion's base contract still requires neither counts nor physical dimensions.
export const baseExtent: FriezeExtent = {
  columns: 2,
  rows: 6,
  blocks: [{ year: 2026, startCol: 0, columns: 2 }],
}

export const motionExtent: FriezeExtent = friezeExtent(friezeLayout(archive, FRIEZE_ROWS), FRIEZE_ROWS)
export const baseFrame = friezeFrame(baseExtent, sceneGeometry(1440, 900))
export const packedFrame = friezeFrame(motionExtent, sceneGeometry(1440, 900))
