import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { ProjectDetail } from './pages/ProjectDetail'
import { SmoothScroll } from './components/layout/SmoothScroll'
import { useScrollLockDuringEntrance } from './hooks/useScrollLockDuringEntrance'

function App() {
  useScrollLockDuringEntrance()
  return (
    <SmoothScroll>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
      </Routes>
    </SmoothScroll>
  )
}

export default App
