import { Hero } from '../components/sections/Hero'
import { Projects } from '../components/sections/Projects'
import { EmbedsGallery } from '../components/sections/EmbedsGallery'
import { WorkExperience } from '../components/sections/WorkExperience'
import { Skills } from '../components/sections/Skills'
import { Contact } from '../components/sections/Contact'
import { Footer } from '../components/layout/Footer'

export function Home() {
  return (
    <main>
      <Hero />
      <Projects />
      <EmbedsGallery />
      <WorkExperience />
      <Skills />
      <Contact />
      <Footer />
    </main>
  )
}
