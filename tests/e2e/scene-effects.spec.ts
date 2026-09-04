import { test, expect } from '@playwright/test'
import { inflateSync } from 'node:zlib'

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

  await page.evaluate(() => {
    const wrapper = document.querySelector('#projects .scene-scroll') as HTMLElement | null
    if (!wrapper) return
    const top = wrapper.getBoundingClientRect().top + window.scrollY
    window.scrollTo({
      top: top + 0.15 * (wrapper.offsetHeight - window.innerHeight),
      behavior: 'instant' as ScrollBehavior,
    })
  })
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

  expect(errors).toEqual([])
})
