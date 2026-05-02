import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { ProjectDetail } from './pages/ProjectDetail'
import { LoadingScreen } from './components/layout/LoadingScreen'
import { SmoothScroll } from './components/layout/SmoothScroll'

function App() {
  return (
    <>
      <LoadingScreen />
      <SmoothScroll>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />
        </Routes>
      </SmoothScroll>
    </>
  )
}

export default App
