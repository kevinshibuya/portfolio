import { useCallback, useEffect, useRef, useState } from 'react'

const KATAKANA = ['シ', 'ブ', 'ヤ', 'ト', 'ウ', 'キ', 'ョ', 'カ', 'ナ', 'ル', 'ハ', 'ミ']
const LATIN = 'abcdefghijklmnopqrstuvwxyz'.split('')
const POOL = [...LATIN, ...KATAKANA]

/** Returns a random glyph from the pool. */
const randGlyph = (): string => POOL[Math.floor(Math.random() * POOL.length)]

interface Options {
  /** The string to settle to at the end of the animation. */
  target: string
  /** Total animation duration in ms (all chars settle by this time). Default: 600 */
  duration?: number
  /**
   * Stagger between characters starting to scramble, in ms.
   * Char i begins scrambling at i * perCharStagger.
   * All chars settle at elapsed >= duration.
   * Default: 30
   */
  perCharStagger?: number
  /** Re-trigger within this window (ms) is ignored. Default: 800 */
  cooldown?: number
}

export interface ScrambleReturn {
  /** The current display text — scrambled in-flight, target once settled. */
  text: string
  /** Trigger a scramble cycle (no-op within cooldown). */
  trigger: () => void
  /**
   * performance.now() value at the start of the most-recent cycle.
   * 0 before any trigger has fired.
   */
  lastStartedAt: number
}

export function useScramble({
  target,
  duration = 600,
  perCharStagger = 30,
  cooldown = 800,
}: Options): ScrambleReturn {
  const [text, setText] = useState<string>(target)
  const startedAtRef = useRef<number>(0)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef<string>(target)

  // Keep targetRef in sync and reset display when target prop changes
  useEffect(() => {
    targetRef.current = target
    setText(target)
  }, [target])

  const trigger = useCallback((): void => {
    const now = performance.now()
    // Enforce cooldown: ignore if a cycle started less than `cooldown` ms ago
    if (now - startedAtRef.current < cooldown) return

    startedAtRef.current = now

    // Cancel any in-flight animation before starting a new one
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const tgt = targetRef.current

    const tick = (): void => {
      const elapsed = performance.now() - startedAtRef.current

      if (elapsed >= duration) {
        // Animation complete — settle to exact target
        setText(tgt)
        rafRef.current = null
        return
      }

      const next = Array.from(tgt)
        .map((ch, i) => {
          // The period is always static — preserve it
          if (ch === '.') return ch
          const charStart = i * perCharStagger
          // Before this char's start: show target char (not yet active)
          if (elapsed < charStart) return ch
          // Active scramble window: charStart <= elapsed < duration
          return randGlyph()
        })
        .join('')

      setText(next)
      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [cooldown, duration, perCharStagger])

  // Cleanup on unmount
  useEffect(
    () => () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    },
    []
  )

  return { text, trigger, lastStartedAt: startedAtRef.current }
}
