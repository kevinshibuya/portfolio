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
      'HTML / CSS',
      'SASS',
    ],
  },
  {
    key: 'design',
    skills: [
      'D3.js',
      'GSAP',
      'Framer Motion',
      'Figma',
      'Photoshop',
      'After Effects',
      'Blender',
    ],
  },
  {
    key: 'backend',
    skills: [
      'Node.js',
      'NestJS',
      'GCP',
      'AWS',
      'Cloudflare',
      'Firebase',
    ],
  },
  {
    key: 'devops',
    skills: [
      'Git',
      'CI/CD',
      'npm',
      'Webpack',
      'Vite',
      'Jest',
      'Jasmine',
      'Karma',
    ],
  },
  {
    key: 'ai',
    skills: [
      'LLM API Integration',
      'RAG',
      'Embeddings / Vector Search',
      'Prompt Engineering / Evals',
      'Agentic Coding',
      'AI Agents',
      'MCP / Tool Use',
    ],
  },
  {
    key: 'leadership',
    skills: [
      'Team Leadership',
      'Mentoring',
      'Stakeholder Communication',
      'Code Review',
      'Sprint Planning',
      'Agile / Scrum',
      'Jira',
    ],
  },
]
