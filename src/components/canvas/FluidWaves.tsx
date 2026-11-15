import { useEffect, useRef, useState, type ReactElement } from 'react'
import { useMotion } from '../../context/MotionContext'
import { createPainter } from './paint'

export interface FluidWavesProps {
  /** The first screen's paint, or the closing ground's. */
  kind: 'hero' | 'footer'
  /** Footer: the share of the canvas height the black eats into from the top. */
  sinkTop?: number
}

const IDS = { hero: 'fluid-waves', footer: 'fluid-waves-closing' } as const

/**
 * A canvas of the paint (paint.ts). It draws only while on screen and only
 * while no other canvas is drawing. Where WebGL is missing, a static stand-in
 * in the paint's colours takes its place.
 */
export function FluidWaves({ kind, sinkTop = 0 }: FluidWavesProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [failed, setFailed] = useState(false)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const painter = createPainter(canvas, {
      kind,
      id: IDS[kind],
      reducedMotion: prefersReducedMotion,
      zone: kind === 'hero' ? () => document.querySelector<HTMLElement>('.hero-zone') : undefined,
      sinkTop,
      onFail: () => setFailed(true),
    })
    if (!painter) return

    const measure = (): void => painter.measure()
    window.addEventListener('resize', measure)
    // The hero's type moves when its font lands or the language changes.
    window.addEventListener('hero:measure', measure)
    document.fonts?.ready.then(measure).catch(() => {})

    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) canvas.removeAttribute('data-paused')
      else canvas.dataset.paused = 'true'
      painter.setInView(entry.isIntersecting)
    })
    io.observe(canvas)

    return () => {
      io.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('hero:measure', measure)
      painter.dispose()
    }
  }, [prefersReducedMotion, kind, sinkTop])

  if (failed) {
    return <div className="paint-fallback" data-kind={kind} data-testid="fluid-waves-fallback" aria-hidden="true" />
  }
  return <canvas ref={canvasRef} className="paint-canvas" data-canvas={IDS[kind]} aria-hidden="true" />
}
