import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useMotion } from '../../context/MotionContext'
import { E1, E2 } from '../../utils/ease'
import { preloadRoute } from '../../routes'

/**
 * How one page gives way to the next.
 *
 * Leaving and arriving overlap: the page that is leaving is held as a picture
 * of itself until the next page is in the document, then dissolves over it in
 * PAGE_OUT_MS while the next page's parts are already arriving underneath. No
 * frame between the two is bare ground (the PAGE CHANGE rules in index.css).
 * A browser without view transitions fades the old page and swaps at once.
 * Arriving (also on a direct load, once the loader has gone): the parts of
 * the first screen come in on their own, in order. A part says what it is
 * with `data-enter`:
 *   title   rises 320 px while popping, at 0 ms
 *   frame   rises from under the bottom edge at 1.25 scale, 575 ms, 52 ms apart
 *   pop     small parts pop, from 250 ms, 17 ms apart
 *   late    labels and trails pop last, from 350 ms
 * `data-enter-group="n"` holds a part back by n times 140 ms, so the second
 * and third rows of a list follow the first.
 */

const FADE_MS = 150
/** How long the old page's picture is held for a page that does not arrive. */
const ARRIVE_WAIT_MS = 1200

interface GoOptions {
  state?: unknown
}

interface PageChangeValue {
  go: (to: string, options?: GoOptions) => void
}

const Ctx = createContext<PageChangeValue | null>(null)

/** The page change waiting for its next page, if one is under way. */
let onArrive: (() => void) | null = null

/** A page says it is in the document: the old page's picture may start to go. */
export function pageArrived(): void {
  delete document.documentElement.dataset.leaving
  onArrive?.()
  onArrive = null
}

type Transition = { finished: Promise<void> }
type StartTransition = (update: () => Promise<void>) => Transition

export function PageChangeProvider({ children }: { children: ReactNode }): ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { prefersReducedMotion } = useMotion()
  const busy = useRef(false)
  const pathRef = useRef(location.pathname)
  pathRef.current = location.pathname

  const go = useCallback(
    (to: string, options?: GoOptions) => {
      if (busy.current) return
      if (prefersReducedMotion || to === pathRef.current) {
        navigate(to, { state: options?.state })
        return
      }
      busy.current = true
      const loaded = preloadRoute(to)
      const doc = document as Document & { startViewTransition?: StartTransition }
      if (typeof doc.startViewTransition !== 'function') {
        document.documentElement.dataset.leaving = ''
        window.setTimeout(() => {
          busy.current = false
          navigate(to, { state: options?.state })
          // A page that never arrives must not leave the screen blank.
          window.setTimeout(() => delete document.documentElement.dataset.leaving, ARRIVE_WAIT_MS)
        }, FADE_MS)
        return
      }
      const done = (): void => {
        busy.current = false
      }
      void loaded.then(() => {
        const arrived = new Promise<void>((resolve) => {
          onArrive = resolve
          window.setTimeout(resolve, ARRIVE_WAIT_MS)
        })
        try {
          const transition = doc.startViewTransition!(async () => {
            navigate(to, { state: options?.state })
            await arrived
          })
          transition.finished.then(done, done)
        } catch {
          done()
          navigate(to, { state: options?.state })
        }
      })
    },
    [navigate, prefersReducedMotion],
  )

  const value = useMemo(() => ({ go }), [go])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function usePageChange(): PageChangeValue {
  const value = useContext(Ctx)
  if (!value) throw new Error('usePageChange must be used within PageChangeProvider')
  return value
}

export interface TLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  state?: unknown
  ref?: Ref<HTMLAnchorElement>
  children?: ReactNode
}

/** A link to another page of this site: it plays the page change. */
export function TLink({ to, state, ref, onClick, onPointerEnter, children, ...rest }: TLinkProps): ReactElement {
  const { go } = usePageChange()
  const click = (e: MouseEvent<HTMLAnchorElement>): void => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    go(to, { state })
  }
  return (
    <a
      ref={ref}
      href={to}
      onClick={click}
      onPointerEnter={(e) => {
        onPointerEnter?.(e)
        void preloadRoute(to)
      }}
      {...rest}
    >
      {children}
    </a>
  )
}

/**
 * Plays a page's arrival on the parts of its first screen. Call it from the
 * page component with the element that holds the page; `key` changes when the
 * page shows something new under the same component (another project).
 */
export function usePageEnter(rootRef: RefObject<HTMLElement | null>, key: string = ''): void {
  const { prefersReducedMotion, entranceDone } = useMotion()

  useLayoutEffect(() => {
    pageArrived()
    const root = rootRef.current
    if (!root || prefersReducedMotion) return

    const fold = window.innerHeight
    const parts = [...root.querySelectorAll<HTMLElement>('[data-enter]')].filter(
      (el) => el.getBoundingClientRect().top < fold,
    )
    for (const el of parts) el.style.visibility = 'hidden'

    let cancelled = false
    let raf = 0
    const running: Animation[] = []
    const play = (
      el: HTMLElement,
      frames: Keyframe[] | PropertyIndexedKeyframes,
      duration: number,
      delay: number,
      easing: string,
    ): void => {
      running.push(el.animate(frames, { duration, delay, easing, fill: 'backwards' }))
    }
    const pop = (el: HTMLElement, delay: number, rise: string, duration: number): void => {
      play(el, { translate: [rise, '0 0'] }, duration, delay, E2)
      play(el, { scale: [0, 1] }, 100, delay, 'steps(2, jump-none)')
    }

    entranceDone
      .then(() => {
        if (cancelled) return
        raf = requestAnimationFrame(() => {
          if (cancelled) return
          let frames = 0
          let pops = 0
          let late = 0
          for (const el of parts) {
            const hold = Number(el.dataset.enterGroup ?? 0) * 140
            const kind = el.dataset.enter
            el.style.visibility = ''
            if (kind === 'title') {
              el.style.transformOrigin = 'left bottom'
              pop(el, hold, '0 320px', 450)
            } else if (kind === 'frame') {
              const below = Math.max(120, fold - el.getBoundingClientRect().top + 24)
              play(
                el,
                [{ transform: `translateY(${below}px) scale(1.25)` }, { transform: 'none' }],
                575,
                hold + 25 + frames++ * 52,
                E1,
              )
            } else if (kind === 'late') {
              pop(el, hold + 350 + late++ * 34, '0 0.7em', 350)
            } else {
              pop(el, hold + 250 + pops++ * 17, '0 0.7em', 350)
            }
          }
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      for (const animation of running) animation.cancel()
      for (const el of parts) el.style.visibility = ''
    }
  }, [rootRef, key, prefersReducedMotion, entranceDone])
}
