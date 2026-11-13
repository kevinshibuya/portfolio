import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { SmoothScroll } from './components/layout/SmoothScroll'
import { useScrollLockDuringEntrance } from './hooks/useScrollLockDuringEntrance'

const ProjectDetail = lazy(() =>
  import('./pages/ProjectDetail').then((m) => ({ default: m.ProjectDetail }))
)
const AllWork = lazy(() =>
  import('./pages/AllWork').then((m) => ({ default: m.AllWork }))
)

function App() {
  useScrollLockDuringEntrance()
  return (
    <SmoothScroll>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/projects/:slug"
          element={
            <Suspense fallback={null}>
              <ProjectDetail />
            </Suspense>
          }
        />
        <Route
          path="/all-work"
          element={
            <Suspense fallback={null}>
              <AllWork />
            </Suspense>
          }
        />
      </Routes>
    </SmoothScroll>
  )
}

export default App
