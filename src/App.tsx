import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/Header'
import { Home } from './pages/Home'
import { ProjectDetail } from './pages/ProjectDetail'
import { LoadingScreen } from './components/layout/LoadingScreen'

function App() {
  return (
    <>
      <LoadingScreen />
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/projects/:slug" element={<ProjectDetail />} />
      </Routes>
    </>
  )
}

export default App
