import type { WorkExperience } from '../types/content'

export const workExperiences: WorkExperience[] = [
  {
    id: 1,
    company: 'Grupo RBS',
    role: {
      en: 'Interactive Projects Developer',
      pt: 'Desenvolvedor de Projetos Interativos',
    },
    period: '2023 – Present',
    description: {
      en: [
        'Worked in a newsroom with 1000+ employees developing interactive projects and creating hundreds of editorial content pieces',
        'Built a poll system using Next.js and Firebase that replaced an existing paid service, widely adopted across the company',
        "Developed the 'Reconstruction Dashboard' for visibility into federal investments in the recovery from the May 2024 floods in RS",
      ],
      pt: [
        'Atuei numa redação com mais de 1000 funcionários desenvolvendo projetos interativos e criando centenas de conteúdos editoriais',
        'Criei sistema de enquetes usando Next.js e Firebase que substituiu serviço pago existente, amplamente adotado pela empresa',
        'Desenvolvi o dashboard "Painel da Reconstrução" para visibilidade dos investimentos federais na recuperação das enchentes de maio de 2024 no RS',
      ],
    },
    technologies: [
      'Next.js',
      'Firebase',
      'React',
      'TypeScript',
      'Data Visualization',
    ],
    highlight: {
      en: 'RBS Journalism, Sports & Entertainment Award — Dashboard inspired government initiatives',
      pt: 'Prêmio RBS de Jornalismo, Esporte e Entretenimento — Dashboard inspirou iniciativas governamentais',
    },
  },
  {
    id: 2,
    company: 'Tech Company',
    role: {
      en: 'Senior Front-end Developer & Tech Lead',
      pt: 'Desenvolvedor Front-end Sênior & Tech Lead',
    },
    period: '2021 – 2023',
    description: {
      en: [
        'Developed multiple modules for applications in Angular 11 and ReactJS using TypeScript',
        'Managed sprints through Jira, coordinating a team of 5 developers',
        'Implemented best practices including clean code, pull requests, code reviews and unit tests',
        'Collaborated with Product Owner on feature definitions applying technical knowledge',
      ],
      pt: [
        'Desenvolvi múltiplos módulos para aplicações em Angular 11 e ReactJS utilizando TypeScript',
        'Gerenciei sprints através do Jira, coordenando equipe de 5 desenvolvedores',
        'Implementei boas práticas incluindo clean code, pull requests, code reviews e testes unitários',
        'Colaborei com Product Owner na definição de funcionalidades aplicando conhecimento técnico',
      ],
    },
    technologies: [
      'Angular 11',
      'ReactJS',
      'TypeScript',
      'Jira',
      'Agile',
      'Clean Code',
    ],
  },
  {
    id: 3,
    company: 'Sports Management Platform',
    role: {
      en: 'Front-end Developer',
      pt: 'Desenvolvedor Front-end',
    },
    period: '2020 – 2021',
    description: {
      en: [
        'Developed mobile and web interfaces with React and Angular, implementing tests with Jest and Jasmine/Karma',
        'Created features following TDD, converting PSD designs into pixel-perfect interfaces',
        'Implemented a scheduling system with Google Maps API integration',
        'Established efficient backend API communication through Axios',
      ],
      pt: [
        'Desenvolvi interfaces móveis e web com React e Angular, implementando testes com JEST e Jasmine/Karma',
        'Criei features seguindo TDD, convertendo designs PSD em interfaces pixel-perfect',
        'Implementei sistema de agendamento com integração ao Google Maps API',
        'Estabeleci comunicação eficiente com APIs backend através do Axios',
      ],
    },
    technologies: [
      'React',
      'Angular',
      'JEST',
      'Jasmine',
      'TDD',
      'Google Maps API',
      'Axios',
    ],
  },
  {
    id: 4,
    company: 'ERP Contábil',
    role: {
      en: 'Front-end Developer',
      pt: 'Desenvolvedor Front-end',
    },
    period: '2019 – 2020',
    description: {
      en: [
        'Worked on modernizing interfaces of the accounting-focused ERP system',
        'Refactored interfaces using HTML, CSS (SASS and LESS) and Angular',
        'Performed code optimization and cleanup, removing obsolete code to improve performance',
      ],
      pt: [
        'Atuei na modernização de interfaces do sistema ERP focado em soluções contábeis',
        'Refatorei interfaces utilizando HTML, CSS (SASS e LESS) e Angular',
        'Realizei otimização e limpeza de código, removendo código obsoleto para melhorar performance',
      ],
    },
    technologies: ['Angular', 'HTML', 'CSS', 'SASS', 'LESS', 'ERP Systems'],
  },
  {
    id: 5,
    company: 'E-commerce Autopeças',
    role: {
      en: 'Front-end Developer',
      pt: 'Desenvolvedor Front-end',
    },
    period: '2018 – 2019',
    description: {
      en: [
        'Developed responsive e-commerce platforms for the auto parts market',
        'Customized digital catalogs adapting styles and functionality per client',
        'Created intuitive interfaces optimized for auto parts distributors',
      ],
      pt: [
        'Desenvolvi plataformas e-commerce responsivas para mercado de autopeças',
        'Customizei catálogos digitais adaptando estilos e funcionalidades por cliente',
        'Criei interfaces intuitivas otimizadas para distribuidores de autopeças',
      ],
    },
    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'AngularJS',
      'E-commerce',
      'Responsive Design',
    ],
  },
]
