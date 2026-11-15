import { Suspense, type ReactElement } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { PageChangeProvider } from './components/layout/PageChange'
import { Home } from './pages/Home'
import { SmoothScroll } from './components/layout/SmoothScroll'
import { useScrollLockDuringEntrance } from './hooks/useScrollLockDuringEntrance'
import { useScrollMemory } from './hooks/useScrollMemory'
import { allWorkPage, projectPage } from './routes'

const ProjectDetail = projectPage.Page
const AllWork = allWorkPage.Page

function App(): ReactElement {
  useScrollLockDuringEntrance()
  useScrollMemory()
  return (
    <SmoothScroll>
      <PageChangeProvider>
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
          {/* Any other path gets the not-found view of the project template. */}
          <Route
            path="*"
            element={
              <Suspense fallback={null}>
                <ProjectDetail />
              </Suspense>
            }
          />
        </Routes>
      </PageChangeProvider>
    </SmoothScroll>
  )
}

export default App
