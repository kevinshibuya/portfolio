export interface SkillCategory {
  key: string
  skills: string[]
}

export const skillCategories: SkillCategory[] = [
  {
    key: 'frontend',
    skills: [
      'React',
      'Next.js',
      'TypeScript',
      'Angular',
      'Tailwind CSS',
      'Framer Motion',
      'GSAP',
      'D3.js',
      'HTML / CSS',
      'Responsive Design',
    ],
  },
  {
    key: 'backend',
    skills: [
      'Node.js',
      'Firebase',
      'REST APIs',
      'Git',
      'CI/CD',
      'Jest',
      'Webpack / Vite',
      'Agile / Scrum',
    ],
  },
  {
    key: 'expertise',
    skills: [
      'Data Visualization',
      'Interactive Journalism',
      'Editorial Design',
      'UX / UI Design',
      'Performance Optimization',
      'Team Leadership',
    ],
  },
]
