import type { WorkExperience } from '../types/content'

export const workExperiences: WorkExperience[] = [
  {
    id: 1,
    company: 'Grupo RBS',
    role: {
      en: 'Frontend Developer II',
      pt: 'Desenvolvedor Frontend II',
    },
    period: { en: 'Nov 2023 — Present', pt: 'Nov 2023 — Atual' },
    location: 'Porto Alegre, BR',
    workMode: 'in-person',
    description: {
      en: [
        "Built interactive projects inside a 1000+ employee newsroom, shipping hundreds of editorial pieces plus campaigns like 'Pra Cima, Rio Grande'",
        "Shipped 'Enquetes GZH', a Firebase-backed live-voting system that replaced a paid service: atomic vote counting with real-time updates, an authenticated back-office, and origin-based access control. It powered 71 live polls during BBB 26, with top 'Paredão' ballots drawing up to 144k votes",
        "Designing and building 'Radar Legislativo' (pre-launch): a NestJS/PostgreSQL REST API with Redis/Bull queues and daily scraping of the Chamber's open data, a Next.js editorial back-office, and an AI pipeline with human review before publication, shipped via GitLab CI/CD to Kubernetes on GCP",
        "Built the 'Painel da Reconstrução' dashboard tracking public and private investment into Rio Grande do Sul's May 2024 flood recovery",
      ],
      pt: [
        "Entreguei projetos interativos dentro de uma redação com mais de 1000 funcionários, com centenas de matérias editoriais, além de campanhas como 'Pra Cima, Rio Grande'",
        "Subi as 'Enquetes GZH', um sistema de votação ao vivo em Firebase que substituiu um serviço pago: contagem atômica de votos em tempo real, back-office autenticado e controle de acesso por origem. Alimentou 71 enquetes ao vivo durante o BBB 26, com votações de 'Paredão' chegando a até 144 mil votos",
        "Projetei e venho construindo o 'Radar Legislativo' (pré-lançamento): API REST em NestJS/PostgreSQL com filas Redis/Bull e raspagem diária dos dados abertos da Câmara, back-office editorial em Next.js e pipeline de IA com revisão humana antes da publicação, com deploy via CI/CD do GitLab em Kubernetes no GCP",
        "Construí o 'Painel da Reconstrução', um dashboard acompanhando o investimento público e privado na recuperação das enchentes de maio de 2024 no Rio Grande do Sul",
      ],
    },
    technologies: [
      'React',
      'TypeScript',
      'Firebase',
      'NestJS',
      'PostgreSQL',
      'Next.js',
      'Data Visualization',
    ],
    highlight: {
      en: 'Won the RBS Journalism, Sports & Entertainment Award, which inspired similar government transparency initiatives',
      pt: 'Venceu o Prêmio RBS de Jornalismo, Esporte e Entretenimento, que inspirou iniciativas semelhantes de transparência governamental',
    },
  },
  {
    id: 2,
    company: 'Flow Autobody',
    role: {
      en: 'Frontend Developer',
      pt: 'Desenvolvedor Frontend',
    },
    period: { en: 'Nov 2022 — Oct 2023', pt: 'Nov 2022 — Out 2023' },
    location: 'Brisbane, AU',
    workMode: 'in-person',
    description: {
      en: [
        'Built modules in Angular 11 and ReactJS with TypeScript, contributing to product architecture and scale',
        'Coordinated sprints in Jira and tracked progress across a 5-developer team',
        'Set up pull request, code review and unit test workflows, championing clean code in creation and review',
        'Worked side-by-side with the Product Owner to shape and refine features against business rules',
      ],
      pt: [
        'Construí módulos em Angular 11 e ReactJS com TypeScript, contribuindo com a arquitetura e escala do produto',
        'Toquei os sprints no Jira e acompanhei o progresso de um time de 5 devs',
        'Estabeleci fluxos de pull request, code review e testes unitários, defendendo clean code na criação e revisão',
        'Trabalhei lado a lado com o Product Owner para desenhar e refinar features alinhadas às regras de negócio',
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
    company: 'HelloGym',
    role: {
      en: 'Frontend Software Developer',
      pt: 'Desenvolvedor Frontend',
    },
    period: { en: 'Mar 2022 — Sep 2022', pt: 'Mar 2022 — Set 2022' },
    location: 'Minnesota, US',
    workMode: 'remote',
    description: {
      en: [
        'Built mobile and web interfaces in React and Angular, covered with Jest and Jasmine/Karma to keep code quality and scale',
        'Shipped features TDD-first, turning PSD designs into pixel-perfect, responsive screens for the sports team management platform',
        'Implemented a booking system integrated with the Google Maps API',
        'Wired efficient backend communication through Axios',
      ],
      pt: [
        'Entreguei interfaces mobile e web em React e Angular, cobrindo com Jest e Jasmine/Karma para garantir qualidade e escala',
        'Subi features no estilo TDD, transformando designs PSD em telas pixel-perfect e responsivas para a plataforma de gestão de times esportivos',
        'Montei um sistema de agendamento integrado à API do Google Maps',
        'Liguei a comunicação com as APIs do backend via Axios',
      ],
    },
    technologies: [
      'React',
      'Angular',
      'Jest',
      'Jasmine',
      'Karma',
      'TDD',
      'Google Maps API',
      'Axios',
    ],
  },
  {
    id: 4,
    company: 'Hubcount',
    role: {
      en: 'Frontend Developer',
      pt: 'Desenvolvedor Frontend',
    },
    period: { en: 'May 2021 — Jan 2022', pt: 'Mai 2021 — Jan 2022' },
    location: 'São Paulo, BR',
    workMode: 'remote',
    description: {
      en: [
        "Modernized interfaces of an accounting-focused ERP, absorbing the accounting domain's business rules, active in code reviews and dailies",
        'Built and refactored screens with HTML, CSS (SASS and LESS) and Angular, lifting UX and modernizing legacy components',
        'Cleaned up and optimized code, removing dead paths to lift performance and maintainability',
      ],
      pt: [
        'Modernizei interfaces de um ERP voltado a soluções contábeis, absorvendo as regras de negócio do domínio contábil, atuando em code reviews e dailies',
        'Construí e refatorei telas com HTML, CSS (SASS e LESS) e Angular, melhorando a experiência e modernizando componentes legados',
        'Limpei e otimizei o código, eliminando trechos obsoletos para ganhar performance e manutenibilidade',
      ],
    },
    technologies: ['Angular', 'HTML', 'CSS', 'SASS', 'LESS', 'ERP Systems'],
  },
  {
    id: 5,
    company: 'Idéia 2001 Informática',
    role: {
      en: 'Mobile Developer (Intern)',
      pt: 'Desenvolvedor Mobile (Estágio)',
    },
    period: { en: 'Nov 2019 — Apr 2021', pt: 'Nov 2019 — Abr 2021' },
    location: 'São Caetano do Sul, BR',
    workMode: 'in-person',
    description: {
      en: [
        'Built applications for the auto parts market with HTML, CSS, JavaScript and AngularJS',
        'Worked mainly on the frontend, building features and layouts',
        'Pitched fresh ideas to the team whenever possible to push the product forward',
      ],
      pt: [
        'Construí aplicações para o mercado de autopeças com HTML, CSS, JavaScript e AngularJS',
        'Atuei principalmente no frontend, construindo features e layouts',
        'Sempre que dava, trazia ideias novas para o time, empurrando o produto pra frente',
      ],
    },
    technologies: [
      'HTML',
      'CSS',
      'JavaScript',
      'AngularJS',
      'Responsive Design',
    ],
  },
]
