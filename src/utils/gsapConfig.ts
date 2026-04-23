import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(ScrollTrigger, useGSAP)

export const EASE_SMOOTH = 'power2.out'
export const EASE_REVEAL = 'power3.out'
