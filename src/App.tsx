import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useSmoothScroll } from './hooks/useSmoothScroll'
import { ScrollProvider } from './contexts/ScrollContext'
import { useScrollProxy } from './hooks/useScrollProxy'
import { Cursor } from './components/ui/Cursor'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { ProjectDetail } from './pages/ProjectDetail'

const HeroCanvas = lazy(() => import('./components/canvas/HeroCanvas'))

function AppContent() {
  // Initialize ScrollTrigger proxy once
  useScrollProxy()
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects/:slug" element={<ProjectDetail />} />
    </Routes>
  )
}

function App() {
  const { transform, contentRef, scrollToSection, scrollYRef, registerScrollCallback } = useSmoothScroll()

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100vh'
    document.documentElement.style.overflow = 'hidden'
    document.documentElement.style.height = '100vh'

    return () => {
      document.body.style.overflow = ''
      document.body.style.height = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.height = ''
    }
  }, [])

  return (
    <ScrollProvider value={{ scrollToSection, scrollYRef, contentRef, registerScrollCallback }}>
      <div className="fixed inset-0 bg-bg overflow-hidden">
        <Suspense fallback={null}>
          <HeroCanvas />
        </Suspense>
        <Cursor />
        <Header />

        <motion.div
          ref={contentRef}
          data-scroll-container
          style={{
            transform: `translate3d(0, ${transform.y}px, 0) skewY(${transform.skew}deg)`,
            transformOrigin: 'center top',
            willChange: 'transform',
          }}
          className="relative z-10 transform-gpu"
        >
          <AppContent />

          {/* Extra padding for scroll space */}
          <div className="h-96" />
        </motion.div>
      </div>
    </ScrollProvider>
  )
}

export default App
