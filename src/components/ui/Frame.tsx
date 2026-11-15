import { useEffect, useRef, type ReactElement, type ReactNode } from 'react'
import { useMotion } from '../../context/MotionContext'
import { frameAspect } from '../../data/media'
import type { MediaClip, MediaItem } from '../../types/content'

/**
 * The frame: a hard black rectangle with a capture inset in it, the shape the
 * whole site is built from. It holds a still, a recording, or anything passed
 * as children (the portrait's paint, the diagram). A frame takes the shape of
 * its capture, with a thin mat of the same width on every side, whether the
 * capture is a desktop screen or a phone screen.
 */
export interface FrameProps {
  item?: MediaItem
  alt?: string
  /** The `sizes` hint for a still with more than one file. */
  sizes?: string
  /** Fetch the picture at once: for what a page opens on. */
  eager?: boolean
  className?: string
  children?: ReactNode
}

/** A recording: its poster until it is near the viewport, playing while it is, unloaded once it is far. */
function Clip({ item, alt }: { item: MediaClip; alt: string }): ReactElement {
  const ref = useRef<HTMLVideoElement>(null)
  const { prefersReducedMotion } = useMotion()

  useEffect(() => {
    const video = ref.current
    if (!video || prefersReducedMotion) return
    let loaded = false
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!loaded) {
            loaded = true
            video.innerHTML = `<source src="${item.webm}" type="video/webm"><source src="${item.mp4}" type="video/mp4">`
            video.load()
          }
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { rootMargin: '10% 0px' },
    )
    const far = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting || !loaded) return
        loaded = false
        video.pause()
        video.innerHTML = ''
        video.load()
      },
      { rootMargin: '200% 0px' },
    )
    near.observe(video)
    far.observe(video)
    return () => {
      near.disconnect()
      far.disconnect()
      video.pause()
    }
  }, [item, prefersReducedMotion])

  return (
    <video
      ref={ref}
      poster={item.poster}
      width={item.w}
      height={item.h}
      preload="none"
      muted
      loop
      playsInline
      aria-label={alt}
    />
  )
}

export function Frame({ item, alt = '', sizes, eager = false, className, children }: FrameProps): ReactElement {
  return (
    <div className={`frame${className ? ` ${className}` : ''}`}>
      {item?.type === 'clip' && <Clip item={item} alt={alt} />}
      {item?.type === 'still' && (
        <img
          src={item.src}
          srcSet={item.srcset}
          sizes={item.srcset ? sizes : undefined}
          alt={alt}
          width={item.w}
          height={item.h}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
      {children}
    </div>
  )
}

/**
 * A frame with its running number above its top right corner. In a row of
 * frames of one height, `grow` gives each the share of the row its shape asks for.
 */
export function Shot({
  n,
  grow = false,
  enter,
  group,
  className,
  ...frame
}: FrameProps & { n: number; grow?: boolean; enter?: boolean; group?: number }): ReactElement {
  return (
    <figure
      className={`shot${className ? ` ${className}` : ''}`}
      style={grow ? { flex: `${frameAspect(frame.item).toFixed(4)} 1 0` } : undefined}
      data-enter={enter ? 'frame' : undefined}
      data-enter-group={enter && group !== undefined ? group : undefined}
    >
      <span className="shot-n" aria-hidden="true">
        {String(n).padStart(2, '0')}
      </span>
      <Frame {...frame} />
    </figure>
  )
}
