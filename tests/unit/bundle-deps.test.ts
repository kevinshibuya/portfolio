import { describe, it, expect } from 'vitest'
import pkg from '../../package.json'

describe('runtime dependency surface', () => {
  it('only known animation-stack deps live in dependencies', () => {
    const allowed = new Set([
      '@gsap/react', '@react-three/drei', '@react-three/fiber',
      '@tailwindcss/vite', 'framer-motion', 'gsap',
      'i18next', 'react', 'react-dom', 'react-i18next',
      'react-router-dom', 'tailwindcss', 'three',
    ])
    for (const dep of Object.keys(pkg.dependencies)) {
      expect(allowed, `unexpected runtime dep: ${dep}`).toContain(dep)
    }
  })
})
