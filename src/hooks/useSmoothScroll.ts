import { useEffect, useState, useRef, useCallback } from 'react'
import { useReducedMotion } from './useReducedMotion'

interface SmoothScrollTransform {
  y: number
  skew: number
}

interface UseSmoothScrollReturn {
  transform: SmoothScrollTransform
  contentRef: React.RefObject<HTMLDivElement | null>
  scrollToSection: (id: string) => void
  scrollYRef: React.RefObject<number>
  registerScrollCallback: (fn: () => void) => () => void
}

export function useSmoothScroll(): UseSmoothScrollReturn {
  const prefersReducedMotion = useReducedMotion()
  const [transform, setTransform] = useState<SmoothScrollTransform>({ y: 0, skew: 0 })
  const scrollVelocity = useRef(0)
  const targetScrollY = useRef(0)
  const currentScrollY = useRef(0)
  const currentSkew = useRef(0)
  const targetSkew = useRef(0)
  const lastTime = useRef(Date.now())
  const animationId = useRef<number | null>(null)
  const isScrolling = useRef(false)
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)
  const velocityHistory = useRef<number[]>([])
  const scrollYRef = useRef(0)
  const onScrollCallbacks = useRef<Array<() => void>>([])

  const registerScrollCallback = useCallback((fn: () => void): (() => void) => {
    onScrollCallbacks.current.push(fn)
    return () => {
      onScrollCallbacks.current = onScrollCallbacks.current.filter((cb) => cb !== fn)
    }
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()

    const now = Date.now()
    const deltaTime = Math.max(16, now - lastTime.current)
    lastTime.current = now

    const instantVelocity = e.deltaY / deltaTime

    velocityHistory.current.push(instantVelocity)
    if (velocityHistory.current.length > 5) {
      velocityHistory.current.shift()
    }

    const avgVelocity =
      velocityHistory.current.reduce((a, b) => a + b, 0) /
      velocityHistory.current.length
    scrollVelocity.current = avgVelocity

    targetScrollY.current += e.deltaY * 1.2

    const contentHeight =
      contentRef.current?.scrollHeight || document.body.scrollHeight
    const maxScroll = Math.max(0, contentHeight - window.innerHeight)
    targetScrollY.current = Math.max(
      0,
      Math.min(maxScroll, targetScrollY.current)
    )

    targetSkew.current = Math.max(-10, Math.min(10, avgVelocity * 2.5))

    isScrolling.current = true

    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false
      velocityHistory.current = []
      targetSkew.current = 0
    }, 100)

    if (!animationId.current) {
      animationId.current = requestAnimationFrame(animate)
    }
  }, [])

  const animate = useCallback(() => {
    const scrollLerpFactor = isScrolling.current ? 0.15 : 0.08
    const scrollDiff = targetScrollY.current - currentScrollY.current
    currentScrollY.current += scrollDiff * scrollLerpFactor

    const skewLerpFactor = 0.08
    const skewDiff = targetSkew.current - currentSkew.current
    currentSkew.current += skewDiff * skewLerpFactor

    scrollYRef.current = currentScrollY.current

    setTransform({
      y: -currentScrollY.current,
      skew: currentSkew.current,
    })

    for (const cb of onScrollCallbacks.current) cb()

    if (!isScrolling.current && Math.abs(scrollVelocity.current) > 0.01) {
      targetScrollY.current += scrollVelocity.current * 30
      scrollVelocity.current *= 0.92

      const contentHeight =
        contentRef.current?.scrollHeight || document.body.scrollHeight
      const maxScroll = Math.max(0, contentHeight - window.innerHeight)
      targetScrollY.current = Math.max(
        0,
        Math.min(maxScroll, targetScrollY.current)
      )
    }

    const needsAnimation =
      Math.abs(scrollDiff) > 0.1 ||
      Math.abs(skewDiff) > 0.01 ||
      Math.abs(scrollVelocity.current) > 0.001 ||
      isScrolling.current

    if (needsAnimation) {
      animationId.current = requestAnimationFrame(animate)
    } else {
      animationId.current = null
      currentSkew.current = 0
      targetSkew.current = 0
      setTransform({ y: -currentScrollY.current, skew: 0 })
    }
  }, [])

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    targetScrollY.current = el.offsetTop
    const contentHeight =
      contentRef.current?.scrollHeight || document.body.scrollHeight
    const maxScroll = Math.max(0, contentHeight - window.innerHeight)
    targetScrollY.current = Math.max(0, Math.min(maxScroll, targetScrollY.current))
    isScrolling.current = true
    if (!animationId.current) {
      animationId.current = requestAnimationFrame(animate)
    }
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    scrollTimeout.current = setTimeout(() => {
      isScrolling.current = false
    }, 600)
  }, [animate])

  useEffect(() => {
    // If user prefers reduced motion, skip the scroll hijack entirely
    if (prefersReducedMotion) return

    // Prevent native scroll
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100vh'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.height = '100vh'

    window.addEventListener('wheel', handleWheel, { passive: false })

    let touchLastY = 0

    const handleTouchStart = (e: TouchEvent) => {
      touchLastY = e.touches[0].clientY
      velocityHistory.current = []
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      const currentY = e.touches[0].clientY
      const deltaY = touchLastY - currentY

      const syntheticEvent = new WheelEvent('wheel', {
        deltaY: deltaY * 2,
        deltaX: 0,
      })
      handleWheel(syntheticEvent)

      touchLastY = currentY
    }

    const handleTouchEnd = (): void => {
      isScrolling.current = false
      targetSkew.current = 0
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: false })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      if (animationId.current) cancelAnimationFrame(animationId.current)
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current)
    }
  }, [handleWheel, animate, prefersReducedMotion])

  // If reduced motion, return identity transform (native scroll takes over)
  if (prefersReducedMotion) {
    return { transform: { y: 0, skew: 0 }, contentRef, scrollToSection, scrollYRef, registerScrollCallback }
  }

  return { transform, contentRef, scrollToSection, scrollYRef, registerScrollCallback }
}
