import type { DefaultTheme } from 'vitepress'

export const routes: DefaultTheme.Config['nav'] = [
  {
    text: 'Docs',
    items: [
      {
        text: 'Getting started',
        link: '/guide/getting-started/introduction',
      },
      {
        text: 'AuthJS guide',
        link: '/guide/authjs/quick-start',
      },
      {
        text: 'Local / Refresh guide',
        link: '/guide/local/quick-start',
      },
    ],
  },
  // TODO: Add full API docs
  // { text: 'API', link: '/api/overview' },
  {
    text: 'Resources',
    items: [
      {
        text: 'Overview',
        link: '/resources/overview',
      },
      {
        text: 'Migrations',
        link: '/resources/migrations/1.0.0',
      },
      {
        text: 'Security',
        link: '/resources/security',
      },
      {
        text: 'Error references',
        link: '/resources/error-reference',
      },
    ],
  },
  {
    text: '1.0.0',
    items: [
      {
        text: '0.8.1',
        link: 'https://github.com/sidebase/nuxt-auth/tree/0.8.1/docs',
      },
      {
        text: '0.7.2',
        link: 'https://github.com/sidebase/nuxt-auth/tree/0.7.2/docs/content',
      },
      {
        text: '0.6.7',
        link: 'https://github.com/sidebase/nuxt-auth/tree/0.6.7/docs/content',
      },
    ],
  },
]
