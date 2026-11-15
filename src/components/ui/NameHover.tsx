import { useEffect, useRef, type ReactElement } from 'react'
import { useMotion } from '../../context/MotionContext'
import { finePointer } from '../../utils/ease'

/**
 * A name that answers the pointer. Each letter within reach steps away from
 * the drop's side, most under the pointer and not at all at the edge of the
 * reach, and follows on a spring, so the dip trails the pointer as a wave. A
 * drop of the paint pops in beside the text, follows the pointer with the
 * same lag, faces the way it travels and leans with its speed.
 * Fine pointers only; still under reduced motion.
 */
export interface NameHoverProps {
  text: string
  /** Where the drop sits: above the text (letters rise) or below it (letters dip). */
  side?: 'up' | 'down'
  /** Marks the name the motion films look for. */
  filmed?: boolean
}

/** How far a letter moves under the pointer, and how far the pointer reaches, in ems. */
const DEPTH_EM = 0.43
const REACH_EM = 1.43
const STIFFNESS = 240
const DAMPING = 13
const ENTER_MS = 50

export function NameHover({ text, side = 'up', filmed = false }: NameHoverProps): ReactElement {
  const ref = useRef<HTMLSpanElement>(null)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const host = ref.current
    if (!host || prefersReducedMotion || !finePointer()) return
    const letters = [...host.querySelectorAll<HTMLElement>('.namehover-letter')]
    const drop = host.querySelector<HTMLElement>('.namehover-drop')
    if (!drop) return

    const sign = side === 'up' ? -1 : 1
    let centres: number[] = []
    let depth = 6
    let reach = 20
    const offset = letters.map(() => 0)
    const speed = letters.map(() => 0)
    let pointerX = 0
    let inside = false
    let dropX = 0
    let dropV = 0
    let facing = 1
    let lean = 0
    let lastMoveAt = 0
    let lastPointerX = 0
    let pointerSpeed = 0
    let raf = 0
    let last = 0
    let enterTimer = 0

    const measure = (): void => {
      const em = Number.parseFloat(getComputedStyle(host).fontSize) || 14
      depth = DEPTH_EM * em
      reach = REACH_EM * em
      centres = letters.map((letter) => letter.offsetLeft + letter.offsetWidth / 2)
    }

    const frame = (now: number): void => {
      const dt = Math.min(0.032, (now - last) / 1000 || 0.016)
      last = now
      let moving = inside
      for (let i = 0; i < letters.length; i++) {
        const distance = Math.abs(centres[i] - pointerX)
        const target = inside && distance < reach ? sign * depth * 0.5 * (1 + Math.cos((Math.PI * distance) / reach)) : 0
        speed[i] += (STIFFNESS * (target - offset[i]) - DAMPING * speed[i]) * dt
        offset[i] += speed[i] * dt
        if (Math.abs(offset[i]) > 0.05 || Math.abs(speed[i]) > 0.5) moving = true
        letters[i].style.transform = `translateY(${offset[i].toFixed(2)}px)`
      }
      // The drop chases the pointer on the same spring and leans into its speed.
      dropV += (STIFFNESS * (pointerX - dropX) - DAMPING * 1.6 * dropV) * dt
      dropX += dropV * dt
      const idle = now - lastMoveAt > 90
      const wanted = idle ? 0 : Math.max(-40, Math.min(40, pointerSpeed * 40))
      lean += (wanted - lean) * (idle ? 0.12 : 0.3)
      if (Math.abs(lean) > 0.1) moving = true
      drop.style.transform = `translateX(${dropX.toFixed(1)}px) rotate(${lean.toFixed(1)}deg) scaleX(${facing})`
      if (moving) {
        raf = requestAnimationFrame(frame)
      } else {
        raf = 0
        for (const letter of letters) letter.style.transform = ''
      }
    }
    const run = (): void => {
      if (raf) return
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }

    const local = (clientX: number): number => clientX - host.getBoundingClientRect().left

    const onEnter = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      measure()
      pointerX = local(e.clientX)
      lastPointerX = pointerX
      dropX = pointerX
      dropV = 0
      window.clearTimeout(enterTimer)
      enterTimer = window.setTimeout(() => {
        inside = true
        drop.classList.remove('is-off')
        drop.classList.add('is-on')
        run()
      }, ENTER_MS)
    }
    const onMove = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      pointerX = local(e.clientX)
      const moved = pointerX - lastPointerX
      const elapsed = Math.max(1, now - lastMoveAt)
      pointerSpeed = moved / elapsed
      if (Math.abs(moved) > 2) facing = moved > 0 ? 1 : -1
      lastPointerX = pointerX
      lastMoveAt = now
      if (inside) run()
    }
    const onLeave = (): void => {
      window.clearTimeout(enterTimer)
      inside = false
      drop.classList.remove('is-on')
      drop.classList.add('is-off')
      run()
    }

    host.addEventListener('pointerenter', onEnter)
    host.addEventListener('pointermove', onMove)
    host.addEventListener('pointerleave', onLeave)
    return () => {
      host.removeEventListener('pointerenter', onEnter)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
      window.clearTimeout(enterTimer)
      cancelAnimationFrame(raf)
      for (const letter of letters) letter.style.transform = ''
    }
  }, [text, side, prefersReducedMotion])

  return (
    <span ref={ref} className="namehover" data-side={side} data-motion={filmed ? 'name-hover' : undefined}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {[...text].map((char, index) => (
          <span key={index} className="namehover-letter">
            {char}
          </span>
        ))}
      </span>
      <span className="namehover-drop" aria-hidden="true">
        <span className="namehover-drop-shape" />
      </span>
    </span>
  )
}
