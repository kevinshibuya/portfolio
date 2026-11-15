import type { WorkExperience } from '../types/content'

export const workExperiences: WorkExperience[] = [
  {
    id: 1,
    company: 'Grupo RBS',
    role: {
      en: 'Full-Stack Developer II',
      pt: 'Desenvolvedor Full-Stack Pleno',
    },
    period: { en: 'Nov 2023 – Present', pt: 'Nov 2023 – Atual' },
    location: 'Porto Alegre, BR',
    workMode: 'in-person',
    description: {
      en: [
        'Built ‘Painel da Reconstrução’ (Reconstruction Panel), which won the ‘Prêmio RBS de Jornalismo, Esporte e Entretenimento’. The dashboard let people in Rio Grande do Sul follow R$129B in public and private investment in the state’s 2024 flood recovery',
        'Created ‘Enquetes GZH’, a live-voting poll system built on Firebase that replaced a paid service. Modeled the vote data layer with atomic counting and real-time updates, built a CRUD back-office with Google authentication restricted to corporate domains, and implemented origin-based access control via security rules and a Cloud Function. It has run 71 live polls and collected 760k votes. The highest-volume BBB 26 ‘Paredão’ poll reached 144k',
        'Designing the architecture and building ‘Radar Legislativo’ (pre-launch), a legislative-data platform with a NestJS REST API, PostgreSQL/TypeORM migrations, Redis/Bull queues, and daily cron-based ingestion of the Chamber of Deputies’ open data. The platform includes an authenticated Next.js editorial back-office and an AI (artificial intelligence) pipeline that generates voting summaries for human review and approval before publication. GitLab CI/CD runs tests, builds Docker images, and deploys to Kubernetes on GCP',
        'Shipped hundreds of interactive editorial pieces, including work for the ‘Pra Cima, Rio Grande’ campaign',
      ],
      pt: [
        'Desenvolvi o ‘Painel da Reconstrução’, vencedor do ‘Prêmio RBS de Jornalismo, Esporte e Entretenimento’. O dashboard permitiu à população do Rio Grande do Sul acompanhar R$ 129 bilhões em investimentos públicos e privados na recuperação das enchentes de 2024',
        'Criei o ‘Enquetes GZH’, um sistema de votação ao vivo construído em Firebase que substituiu um serviço pago. Modelei a camada de dados dos votos com contagem atômica e atualização em tempo real, construí um back-office CRUD com autenticação Google restrita aos domínios corporativos e implementei controle de acesso por origem via regras de segurança e uma Cloud Function. Já sustentou 71 enquetes ao vivo e reuniu 760 mil votos. A enquete de ‘Paredão’ do BBB 26 com maior volume chegou a 144 mil',
        'Projeto a arquitetura e desenvolvo o ‘Radar Legislativo’ (pré-lançamento), plataforma de dados legislativos com API REST em NestJS, migrations em PostgreSQL/TypeORM, filas com Redis/Bull e ingestão diária via cron dos dados abertos da Câmara. A plataforma inclui um back-office editorial autenticado em Next.js e um pipeline de IA (inteligência artificial) que gera resumos de votações para revisão e aprovação humana antes da publicação. O CI/CD no GitLab roda testes, cria imagens Docker e faz deploy em Kubernetes no GCP',
        'Entreguei centenas de peças editoriais interativas, incluindo trabalhos para a campanha ‘Pra Cima, Rio Grande’',
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
      en: 'Full-Stack Developer',
      pt: 'Desenvolvedor Full-Stack',
    },
    period: { en: 'Nov 2022 – Oct 2023', pt: 'Nov 2022 – Out 2023' },
    location: 'Brisbane, AU',
    workMode: 'in-person',
    description: {
      en: [
        'Led a team of five developers and coordinated sprint planning, task assignment, and progress tracking in Jira',
        'Developed modules in Angular 11 and React with TypeScript',
        'Built .NET service modules end to end for the ERP, covering parts and inventory synchronization and job-card scheduling',
        'Implemented RabbitMQ batch processes to validate inventory',
        'Established pull request, code review, and unit-testing workflows',
        'Defined and refined features with the Product Owner and translated business rules into implementation decisions',
      ],
      pt: [
        'Liderei um time de cinco desenvolvedores e coordenei o planejamento de sprints, a distribuição de tarefas e o acompanhamento do progresso no Jira',
        'Desenvolvi módulos em Angular 11 e React com TypeScript',
        'Desenvolvi de ponta a ponta módulos de serviço em .NET para o ERP, cobrindo sincronização de peças e estoque e agendamento de job cards',
        'Implementei processos em lote com RabbitMQ para validar o estoque',
        'Estabeleci fluxos de pull request, code review e testes unitários',
        'Defini e refinei funcionalidades com o Product Owner e traduzi regras de negócio em decisões de implementação',
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
      en: 'Front-end Developer',
      pt: 'Desenvolvedor Front-end',
    },
    period: { en: 'Mar 2022 – Sep 2022', pt: 'Mar 2022 – Set 2022' },
    location: 'Minnesota, US',
    workMode: 'remote',
    description: {
      en: [
        'Developed interfaces for mobile and web applications using React and Angular, with unit tests in Jest and Jasmine/Karma',
        'Built features with TDD (test-driven development) and converted PSD designs into responsive interfaces for a sports team management platform',
        'Implemented a booking system with Google Maps API integration',
        'Integrated front-end features with back-end APIs using Axios',
      ],
      pt: [
        'Desenvolvi interfaces para aplicações mobile e web em React e Angular, com testes unitários em Jest e Jasmine/Karma',
        'Construí funcionalidades com TDD (desenvolvimento orientado a testes) e converti designs PSD em interfaces responsivas para uma plataforma de gestão de times esportivos',
        'Implementei um sistema de agendamento integrado à API do Google Maps',
        'Integrei funcionalidades do front-end com APIs de back-end usando Axios',
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
      en: 'Front-end Developer',
      pt: 'Desenvolvedor Front-end',
    },
    period: { en: 'May 2021 – Jan 2022', pt: 'Mai 2021 – Jan 2022' },
    location: 'São Paulo, BR',
    workMode: 'remote',
    description: {
      en: [
        'Modernized the interfaces of an accounting ERP in Angular, HTML and CSS (SASS and LESS), applying its business rules in front-end features',
        'Removed obsolete code and simplified legacy components to make them easier to maintain',
      ],
      pt: [
        'Modernizei as interfaces de um ERP contábil em Angular, HTML e CSS (SASS e LESS), aplicando suas regras de negócio nas funcionalidades de front-end',
        'Removi código obsoleto e simplifiquei componentes legados para facilitar a manutenção',
      ],
    },
    technologies: ['Angular', 'HTML', 'CSS', 'SASS', 'LESS', 'ERP Systems'],
  },
  {
    id: 5,
    company: 'Idéia 2001 Informática',
    role: {
      en: 'Mobile Developer Intern',
      pt: 'Estagiário de Desenvolvimento Mobile',
    },
    period: { en: 'Nov 2019 – Apr 2021', pt: 'Nov 2019 – Abr 2021' },
    location: 'São Caetano do Sul, BR',
    workMode: 'in-person',
    description: {
      en: [
        'Developed front-end features and layouts for auto-parts applications using HTML, CSS, JavaScript, and AngularJS',
      ],
      pt: [
        'Desenvolvi funcionalidades e layouts de front-end para aplicações do mercado de autopeças com HTML, CSS, JavaScript e AngularJS',
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
