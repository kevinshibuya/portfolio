import { useEffect, useRef, type ReactElement } from 'react'
import { useMotion } from '../../context/MotionContext'
import { E1, outPow } from '../../utils/ease'

/**
 * The label: an icon of two stacked frames and a line of small text. It is
 * the title of a list, and the one heading a page of work has.
 *
 * It arrives in four steps, about 0.9 s from the first to rest: the front
 * frame's outline draws itself (260 ms), the panel behind it fades in (90 ms,
 * from 130 ms), the front frame leans open (320 ms, from 260 ms), and the
 * letters fly out of the icon to their places, last letter first, each along
 * an arc. However long the text, the last letter leaves the icon by 580 ms.
 * A click puts the letters back and closes it; another click plays it again.
 */
export interface LabelProps {
  text: string
  /** Wait this long after the label is in view (and the page has opened) before playing. */
  delay?: number
  /** Marks the label the motion films look for. */
  filmed?: boolean
}

const STROKE_MS = 260
const OPEN_MS = 320
const LETTERS_AT = 320
/** The letters leave at most this far apart, and all within LETTERS_SPAN of the first. */
const LETTER_STEP = 34
const LETTERS_SPAN = 260
const LETTER_MS = 320
const ARC_PEAK = 56
const SAMPLES = 10

export function Label({ text, delay = 0, filmed = false }: LabelProps): ReactElement {
  const ref = useRef<HTMLButtonElement>(null)
  const { prefersReducedMotion, entranceDone } = useMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const front = el.querySelector<SVGRectElement>('.label-front')
    const back = el.querySelector<SVGRectElement>('.label-back')
    const icon = el.querySelector<SVGElement>('.label-icon')
    const letters = [...el.querySelectorAll<HTMLElement>('.label-letter')]
    if (!front || !back || !icon) return

    if (prefersReducedMotion) {
      el.dataset.open = ''
      return
    }

    let running: Animation[] = []
    let timers: number[] = []
    let open = false
    const clear = (): void => {
      for (const animation of running) animation.cancel()
      for (const timer of timers) window.clearTimeout(timer)
      running = []
      timers = []
    }

    /** One letter's flight between the icon's centre and its own place, as sampled keyframes. */
    const flight = (letter: HTMLElement, outward: boolean): Keyframe[] => {
      const from = icon.getBoundingClientRect()
      const to = letter.getBoundingClientRect()
      const dx = from.left + from.width / 2 - (to.left + to.width / 2)
      const dy = from.top + from.height / 2 - (to.top + to.height / 2)
      const peak = Math.min(ARC_PEAK, Math.abs(dx))
      const frames: Keyframe[] = []
      for (let i = 0; i <= SAMPLES; i++) {
        const t = i / SAMPLES
        // Outward the letter eases out of the icon; inward the same path is run back.
        const e = outward ? outPow(t, 1.5) : 1 - outPow(t, 1.5)
        const away = 1 - e
        const scale = 0.35 + 0.65 * Math.min(1, e * 2)
        frames.push({
          transform: `translate(${dx * away}px, ${dy * away - peak * 4 * e * away}px) scale(${scale})`,
          opacity: 1,
          offset: t,
        })
      }
      return frames
    }

    const play = (): void => {
      clear()
      open = true
      delete el.dataset.open
      for (const letter of letters) letter.style.opacity = '0'
      back.style.opacity = '0'
      const length = front.getTotalLength()
      front.style.strokeDasharray = String(length)
      running.push(front.animate({ strokeDashoffset: [length, 0] }, { duration: STROKE_MS, easing: E1, fill: 'backwards' }))
      running.push(back.animate({ opacity: [0, 1] }, { duration: 90, delay: STROKE_MS / 2, easing: E1, fill: 'forwards' }))
      timers.push(
        window.setTimeout(() => {
          front.style.transitionDuration = `${OPEN_MS}ms`
          back.style.transitionDuration = `${OPEN_MS}ms`
          el.dataset.open = ''
        }, STROKE_MS),
        window.setTimeout(() => {
          front.style.transitionDuration = ''
          back.style.transitionDuration = ''
          front.style.strokeDasharray = ''
        }, STROKE_MS + OPEN_MS + 50),
      )
      const step = Math.min(LETTER_STEP, LETTERS_SPAN / Math.max(1, letters.length - 1))
      letters.forEach((letter, index) => {
        const start = LETTERS_AT + (letters.length - 1 - index) * step
        timers.push(
          window.setTimeout(() => {
            const animation = letter.animate(flight(letter, true), { duration: LETTER_MS, easing: 'linear' })
            letter.style.opacity = ''
            running.push(animation)
          }, start),
        )
      })
    }

    const close = (): void => {
      clear()
      open = false
      back.style.opacity = ''
      letters.forEach((letter, index) => {
        const animation = letter.animate(flight(letter, false), {
          duration: 320,
          delay: index * 24,
          easing: 'linear',
          fill: 'backwards',
        })
        animation.onfinish = () => {
          letter.style.opacity = '0'
        }
        running.push(animation)
      })
      timers.push(window.setTimeout(() => delete el.dataset.open, 200))
    }

    // Hidden until it plays, so nothing shows of a label that has yet to arrive.
    for (const letter of letters) letter.style.opacity = '0'
    back.style.opacity = '0'
    front.style.strokeDasharray = String(front.getTotalLength())
    front.style.strokeDashoffset = String(front.getTotalLength())

    let cancelled = false
    let played = false
    let startTimer = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || played) return
        played = true
        io.disconnect()
        entranceDone
          .then(() => {
            if (cancelled) return
            startTimer = window.setTimeout(() => {
              front.style.strokeDashoffset = ''
              play()
            }, delay)
          })
          .catch(() => {})
      },
      { rootMargin: '0px 0px -50px 0px' },
    )
    io.observe(el)

    const onClick = (): void => {
      if (!played) return
      if (open) close()
      else play()
    }
    el.addEventListener('click', onClick)

    return () => {
      cancelled = true
      io.disconnect()
      window.clearTimeout(startTimer)
      el.removeEventListener('click', onClick)
      clear()
      for (const letter of letters) letter.style.opacity = ''
      back.style.opacity = ''
      front.style.strokeDasharray = ''
      front.style.strokeDashoffset = ''
    }
  }, [text, delay, prefersReducedMotion, entranceDone])

  return (
    <button ref={ref} type="button" className="label" aria-label={text} data-motion={filmed ? 'label' : undefined}>
      <svg className="label-icon" viewBox="0 0 24 16" width="24" height="16" aria-hidden="true">
        <rect className="label-back" x="6.5" y="0.5" width="16" height="10.5" />
        <rect className="label-front" x="1.25" y="4.25" width="15.5" height="11" />
      </svg>
      <span aria-hidden="true">
        {[...text].map((char, index) => (
          <span key={index} className="label-letter">
            {char}
          </span>
        ))}
      </span>
    </button>
  )
}
