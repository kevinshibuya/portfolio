import { useEffect, useRef, type CSSProperties, type ReactElement } from 'react'
import { hideWindow, showWindow, type PaintWindow as Win } from './paint'

/**
 * The hero's paint seen through a shape: the site's one graphic motif.
 *
 * A 2D canvas that copies a region of whichever paint canvas is drawing
 * (paint.ts) and cuts it to its shape. With `text`, the shape is that text set
 * in the element's own font, so a numeral becomes a window; without it the
 * window is the element's box. Until the first frame arrives, and where the
 * paint cannot run, the element shows the accent colour through the same shape.
 */
export interface PaintWindowProps {
  /** Cut the paint to these characters. They are also the element's text. */
  text?: string
  className?: string
  style?: CSSProperties
}

const DPR_CAP = 2
/** A window whose feed has just changed blends to the new picture over this long. */
const BLEND_MS = 600

export function PaintWindow({ text, className, style }: PaintWindowProps): ReactElement {
  const hostRef = useRef<HTMLSpanElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = 0
    let height = 0
    let font = ''
    let tracking = '0px'
    let baseline = 0
    let lastFeed = -1
    let blendUntil = 0

    const size = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP)
      // The layout box: an arrival animation scales the element, and a box read through that would be too small to paint.
      width = Math.max(1, Math.round(host.offsetWidth * dpr))
      height = Math.max(1, Math.round(host.offsetHeight * dpr))
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
        lastFeed = -1
      }
      if (text) {
        const style = getComputedStyle(host)
        const px = Number.parseFloat(style.fontSize) * dpr
        font = `${style.fontWeight} ${px}px ${style.fontFamily}`
        tracking = `${(Number.parseFloat(style.letterSpacing) || 0) * dpr}px`
        ctx.font = font
        const metrics = ctx.measureText(text)
        const ascent = metrics.fontBoundingBoxAscent
        const descent = metrics.fontBoundingBoxDescent
        // CSS centres the font's own box in the line box; the baseline follows.
        baseline = (height - (ascent + descent)) / 2 + ascent
      }
    }

    const win: Win = {
      draw: (source, sx, sy, sw, sh, feed) => {
        if (width < 2 || height < 2) return
        // Cover-fit the region to the window, cropping its longer side.
        const ratio = width / height
        let cw = sw
        let ch = sw / ratio
        if (ch > sh) {
          ch = sh
          cw = sh * ratio
        }
        const cx = sx + (sw - cw) / 2
        const cy = sy + (sh - ch) / 2
        const now = performance.now()
        if (feed !== lastFeed) {
          blendUntil = lastFeed === -1 ? 0 : now + BLEND_MS
          lastFeed = feed
        }
        ctx.globalCompositeOperation = 'source-over'
        ctx.globalAlpha = now < blendUntil ? 0.14 : 1
        ctx.drawImage(source, cx, cy, cw, ch, 0, 0, width, height)
        ctx.globalAlpha = 1
        if (text) {
          ctx.globalCompositeOperation = 'destination-in'
          ctx.font = font
          ctx.textBaseline = 'alphabetic'
          if ('letterSpacing' in ctx) ctx.letterSpacing = tracking
          ctx.fillText(text, 0, baseline)
        }
        if (!canvas.dataset.painted) canvas.dataset.painted = 'true'
      },
    }

    size()
    const resizer = new ResizeObserver(size)
    resizer.observe(host)
    document.fonts?.ready.then(size).catch(() => {})

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) showWindow(win)
        else hideWindow(win)
      },
      { rootMargin: '10% 0px' },
    )
    io.observe(host)

    return () => {
      io.disconnect()
      resizer.disconnect()
      hideWindow(win)
    }
  }, [text])

  return (
    <span ref={hostRef} className={`paint-window${text ? ' paint-window--text' : ''}${className ? ` ${className}` : ''}`} style={style}>
      {text}
      <canvas ref={canvasRef} aria-hidden="true" />
    </span>
  )
}
