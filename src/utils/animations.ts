import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const projectEase = 'cubic-bezier(0.22, 1, 0.36, 1)'
export const projectEaseGsap = 'power3.out'

export const durations = {
  fast: 0.2,
  base: 0.6,
  slow: 1.1,
  loader: 1.4,
} as const

export const stagger = {
  embedRows: 0.04,
  base: 0.06,
  scrambleChar: 0.03,
} as const

export const sectionEnterDefaults = {
  y: 24,
  opacity: 0,
  duration: durations.base,
  ease: projectEaseGsap,
} as const
