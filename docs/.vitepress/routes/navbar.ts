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
  {
    text: 'Resources',
    items: [
      {
        text: 'Overview',
        link: '/resources/overview',
      },
      {
        text: 'Recipes',
        link: '/recipes/introduction/welcome',
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
    text: '0.8.0',
    items: [
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
