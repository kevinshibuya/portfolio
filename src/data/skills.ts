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
      'SASS',
      'Responsive Design',
    ],
  },
  {
    key: 'backend',
    skills: [
      'Node.js',
      'GCP',
      'AWS',
      'Cloudflare',
      'Firebase',
      'REST APIs',
      'Git',
      'CI/CD',
      'Jest',
      'Jasmine',
      'Karma',
      'Webpack / Vite',
      'Jira',
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
      'TDD',
      'Clean Code',
      'Team Leadership',
    ],
  },
]
