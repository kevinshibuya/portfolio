import type { WorkExperience } from '../types/content'

export const workExperiences: WorkExperience[] = [
  {
    id: 1,
    company: 'Grupo RBS',
    role: {
      en: 'Full-Stack Developer II',
      pt: 'Desenvolvedor Full-Stack Pleno',
    },
    period: { en: 'Nov 2023 – Jul 2026', pt: 'Nov 2023 – Jul 2026' },
    location: { en: 'Porto Alegre, RS, Brazil', pt: 'Porto Alegre, RS, Brasil' },
    workMode: 'in-person',
    description: {
      en: [
        'Built ‘Painel da Reconstrução’, a public dashboard tracking R$129B in Rio Grande do Sul’s 2024 flood recovery. It won the Prêmio RBS de Jornalismo, Esporte e Entretenimento and the Prêmio Jayme Sirotsky',
        'Created ‘Enquetes GZH’, a live poll system that replaced a paid service and collected 760k votes across 71 polls. Its biggest hit was the Big Brother Brasil 26 eviction polls, one of which drew 144k votes',
        'Designed the architecture and built ‘Radar Legislativo’, an analytics site on how Brazil’s federal deputies vote, which no Brazilian news outlet offered at the time. AI drafts the vote summaries and editors approve them. Finished, but RBS never launched it. NestJS, PostgreSQL, Redis, Docker, Kubernetes on GCP',
        'Shipped 250+ interactive news pieces for GZH',
      ],
      pt: [
        'Desenvolvi o ‘Painel da Reconstrução’, que acompanhou R$ 129 bilhões na recuperação das enchentes de 2024 no RS. Venceu o Prêmio RBS de Jornalismo, Esporte e Entretenimento e o Prêmio Jayme Sirotsky',
        'Criei o ‘Enquetes GZH’, um sistema de enquetes ao vivo que substituiu um serviço pago e reuniu 760 mil votos em 71 enquetes. O maior sucesso foram os Paredões do BBB 26, um deles com 144 mil votos',
        'Projetei a arquitetura e desenvolvi o ‘Radar Legislativo’, site de análise das votações dos deputados federais, algo inédito na imprensa brasileira na época. Uma inteligência artificial redige os resumos e editores os aprovam. Ficou pronto, mas a empresa nunca o lançou. NestJS, PostgreSQL, Redis, Docker, Kubernetes no GCP',
        'Entreguei mais de 250 peças editoriais interativas para o GZH',
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
      en: 'Won the Prêmio RBS de Jornalismo, Esporte e Entretenimento and the Prêmio Jayme Sirotsky',
      pt: 'Venceu o Prêmio RBS de Jornalismo, Esporte e Entretenimento e o Prêmio Jayme Sirotsky',
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
    location: { en: 'Brisbane, QLD, Australia', pt: 'Brisbane, QLD, Austrália' },
    workMode: 'in-person',
    description: {
      en: [
        'Led a team of five developers, running sprint planning, task assignment and progress tracking in Jira',
        'Built .NET service modules for the company’s ERP, covering parts and inventory sync and the scheduling of repair jobs',
        'Wrote RabbitMQ batch processes that validate inventory, and front-end modules in Angular and React with TypeScript',
        'Set up the team’s pull request, code review and unit-testing workflow, and worked with the Product Owner to turn business rules into features',
      ],
      pt: [
        'Liderei um time de cinco desenvolvedores com metodologias ágeis, conduzindo o planejamento de sprints, a distribuição de tarefas e o acompanhamento no Jira',
        'Desenvolvi módulos de serviço em .NET para o ERP da empresa, cobrindo a sincronização de peças e estoque e o agendamento dos serviços de reparo',
        'Escrevi processos em lote com RabbitMQ que validam o estoque, e módulos de front-end em Angular e React com TypeScript',
        'Implantei o fluxo de pull request, code review e testes unitários do time, e trabalhei com o Product Owner para transformar regras de negócio em funcionalidades',
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
    location: { en: 'Osseo, MN, USA', pt: 'Osseo, MN, EUA' },
    workMode: 'remote',
    description: {
      en: [
        'Built web and mobile interfaces in React and Angular for a sports team management platform, turning PSD designs into responsive screens',
        'Built a booking system on the Google Maps API and connected the front end to the back-end APIs',
        'Worked test-first (TDD), with unit tests in Jest and Jasmine/Karma',
      ],
      pt: [
        'Desenvolvi interfaces web e mobile em React e Angular para uma plataforma de gestão de times esportivos, transformando designs em PSD em telas responsivas',
        'Criei um sistema de reservas com a API do Google Maps e liguei o front-end às APIs do back-end',
        'Trabalhei com TDD (desenvolvimento orientado a testes), com testes unitários em Jest e Jasmine/Karma',
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
    location: { en: 'São Paulo, SP, Brazil', pt: 'São Paulo, SP, Brasil' },
    workMode: 'remote',
    description: {
      en: [
        'Modernized the interface of an accounting ERP in Angular, SASS and LESS, applying the accounting business rules to front-end features',
        'Removed obsolete code and simplified legacy components so the team could maintain them more easily',
      ],
      pt: [
        'Modernizei a interface de um ERP contábil em Angular, SASS e LESS, aplicando as regras de negócio contábeis nas funcionalidades de front-end',
        'Removi código obsoleto e simplifiquei componentes legados para facilitar a manutenção pelo time',
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
    location: { en: 'São Caetano do Sul, SP, Brazil', pt: 'São Caetano do Sul, SP, Brasil' },
    workMode: 'in-person',
    description: {
      en: [
        'Built front-end features and layouts for auto-parts applications in HTML, CSS, JavaScript and AngularJS',
      ],
      pt: [
        'Desenvolvi funcionalidades e layouts de front-end para aplicações de autopeças em HTML, CSS, JavaScript e AngularJS',
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
