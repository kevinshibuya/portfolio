import { useTranslation } from 'react-i18next'
import { Hero } from '../components/sections/Hero'
import { About } from '../components/sections/About'
import { WorkExperience } from '../components/sections/WorkExperience'
import { Skills } from '../components/sections/Skills'
import { Projects } from '../components/sections/Projects'
import { EmbedsGallery } from '../components/sections/EmbedsGallery'
import { Contact } from '../components/sections/Contact'
import { Footer } from '../components/layout/Footer'
import { MarqueeDivider } from '../components/ui/MarqueeDivider'

export function Home() {
  const { t } = useTranslation()

  return (
    <main>
      <Hero />
      <MarqueeDivider text={t('sections.about.marquee')} variant="light" />
      <About />
      <MarqueeDivider
        text={t('sections.work.marquee')}
        variant="light"
        direction="right"
      />
      <WorkExperience />
      <MarqueeDivider text={t('sections.skills.marquee')} variant="light" />
      <Skills />
      <MarqueeDivider
        text={t('sections.projects.marquee')}
        variant="light"
        direction="right"
      />
      <Projects />
      <MarqueeDivider text={t('sections.embeds.marquee')} variant="light" />
      <EmbedsGallery />
      <Contact />
      <Footer />
    </main>
  )
}
