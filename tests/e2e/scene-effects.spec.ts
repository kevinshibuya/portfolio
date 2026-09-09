import { test, expect } from '@playwright/test'
import { scrollToPlayhead, scrollToActTwo } from './helpers/scene'
import { inflateSync } from 'node:zlib'
import sharp from 'sharp'
import { sceneGeometry, frameRects } from '../../src/utils/sceneMotion'

/**
 * The depth-of-field composer mounts only on hardware-accelerated desktops, so
 * headless Chromium (SwiftShader) never renders it. That would leave the
 * composer path exercised by nobody but a human, so this spec spoofs a hardware
 * renderer string and drives the REAL gate logic into mounting it.
 *
 * It asserts correctness only, never timing: under software rasterisation the
 * composer's first frame takes seconds, which says nothing about a real GPU.
 */

/** The RGB of a 1x1 PNG screenshot. Avoids pulling in an image dependency. */
function readSinglePixel(png: Buffer): [number, number, number] {
  const parts: Buffer[] = []
  let offset = 8 // skip the PNG signature
  while (offset < png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    if (type === 'IDAT') parts.push(png.subarray(offset + 8, offset + 8 + length))
    if (type === 'IEND') break
    offset += length + 12 // length + type + data + crc
  }
  const raw = inflateSync(Buffer.concat(parts))
  // One scanline: a filter byte then RGBA. On a 1x1 image every filter type
  // reduces to the raw bytes (no left or upper neighbour to predict from), so
  // the filter byte can be skipped whatever it says.
  return [raw[1], raw[2], raw[3]]
}

test('the scene renders through the composer without shifting the cream', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'desktop project only')
  test.slow()

  // UNMASKED_RENDERER_WEBGL is 0x9246. Report an Apple M1 string for that one
  // parameter and delegate every other call, so only the gate's verdict moves.
  await page.addInitScript(() => {
    const UNMASKED_RENDERER_WEBGL = 0x9246
    const original = WebGL2RenderingContext.prototype.getParameter
    WebGL2RenderingContext.prototype.getParameter = function (parameter: number) {
      if (parameter === UNMASKED_RENDERER_WEBGL) {
        return 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)'
      }
      return original.call(this, parameter)
    }
  })

  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(String(error)))

  await page.goto('/')
  await page.waitForFunction(() => document.body.dataset.loaderState === 'done')
  await page.locator('#projects .scene-scroll').waitFor()
  // The composer's warm-up frame is seconds long in software; this is the only
  // place in the suite that pays that cost, hence test.slow().
  await page
    .locator('#projects canvas[data-canvas="selected-work-scene"][data-warm="true"]')
    .waitFor({ timeout: 120_000 })

  await scrollToPlayhead(page, 0) // card 0 settled
  await page.waitForTimeout(3000)

  const canvas = page.locator('#projects canvas[data-canvas="selected-work-scene"]')
  const box = (await canvas.boundingBox())!

  // The scene now renders through a render target. The section's cream has to
  // survive that round trip untouched, or the light chapter seams at the
  // canvas edge — the one regression a screenshot-free suite would miss.
  const pixel = readSinglePixel(
    await page.screenshot({
      clip: { x: box.x + box.width / 2, y: box.y + box.height - 2, width: 1, height: 1 },
    }),
  )
  const cream = [0xf5, 0xf2, 0xec]
  for (let channel = 0; channel < 3; channel++) {
    expect(Math.abs(pixel[channel] - cream[channel])).toBeLessThanOrEqual(1)
  }

  // The title renders AFTER the composer, on its own layer, so depth of field
  // never softens it. A strip across the lower half of the title band must
  // hold real ink and real cream — single pixels land between glyphs, and a
  // blurred title would never reach the ink floor.
  const { card } = frameRects(sceneGeometry(box.width, box.height))
  const stripTop = Math.round((card.top - 0.06) * box.height)
  const strip = await page.screenshot({
    clip: { x: box.x, y: box.y + stripTop, width: box.width, height: 8 },
  })
  const { data, info } = await sharp(strip).raw().toBuffer({ resolveWithObject: true })
  let minLum = 255
  let maxLum = 0
  for (let i = 0; i < data.length; i += info.channels) {
    const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]
    if (lum < minLum) minLum = lum
    if (lum > maxLum) maxLum = lum
  }
  expect(minLum, 'title ink present in the band').toBeLessThan(60)
  expect(maxLum, 'cream present in the band').toBeGreaterThan(200)

  // Act two through the composer. This is the ONLY headless path that runs the
  // composer at all, so it is the only place the DoF focus write in
  // Environment — `cocMaterial.worldFocusDistance` off `sceneRefs.focus` — is
  // exercised end to end.
  await scrollToActTwo(page, 0.5)
  await page.waitForTimeout(1500)
  const sceneCanvas = page.locator('#projects canvas[data-canvas="selected-work-scene"]')
  await expect(sceneCanvas).toHaveAttribute('data-act', '2')
  await expect(sceneCanvas).toHaveAttribute('data-frieze', 'ready')
  await page.waitForTimeout(900)

  // The wall reaches the reader THROUGH the composer, and depth of field is a
  // blur: it is exactly the effect that can leave a wall of small type legible
  // in a screenshot-free suite while turning it to mush on screen. Sample the
  // frieze deep enough to miss the year title, and require both real ink and
  // real cream — a softened wall loses the ink floor first.
  const actTwoBox = (await sceneCanvas.boundingBox())!
  const band = await page.screenshot({
    clip: {
      x: actTwoBox.x,
      y: actTwoBox.y + Math.round(actTwoBox.height * 0.55),
      width: actTwoBox.width,
      height: 40,
    },
  })
  const wall = await sharp(band).raw().toBuffer({ resolveWithObject: true })
  let wallMin = 255
  let wallMax = 0
  let wallSum = 0
  let wallCount = 0
  for (let i = 0; i < wall.data.length; i += wall.info.channels) {
    const lum =
      0.2126 * wall.data[i] + 0.7152 * wall.data[i + 1] + 0.0722 * wall.data[i + 2]
    if (lum < wallMin) wallMin = lum
    if (lum > wallMax) wallMax = lum
    wallSum += lum
    wallCount++
  }
  expect(wallMin, 'frieze ink stays readable through the composer').toBeLessThan(40)
  expect(wallMax, 'cream survives the composer in act two').toBeGreaterThan(200)
  expect(wallSum / wallCount, 'the wall stays a light sheet').toBeGreaterThan(170)

  expect(errors).toEqual([])
})
