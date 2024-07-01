import type { DefaultTheme } from 'vitepress'

export const routes: DefaultTheme.Config['sidebar'] = {
  '/guide': [
    {
      text: 'Getting started',
      base: '/guide/getting-started',
      items: [
        {
          text: 'Introduction',
          link: '/introduction',
        },
        {
          text: 'Installation',
          link: '/installation',
        },
        {
          text: 'Choosing the provider',
          link: '/choose-provider',
        },
      ],
    },
    {
      text: 'AuthJS Provider',
      base: '/guide/authjs',
      items: [
        {
          text: 'Quick Start',
          link: '/quick-start',
        },
        {
          text: 'NuxtAuthHandler',
          link: '/nuxt-auth-handler',
        },
        {
          text: 'Custom pages',
          link: '/custom-pages',
        },
        {
          text: 'Session data',
          link: '/session-data',
        },
      ],
    },
    {
      text: 'Local / Refresh Provider',
      base: '/guide/local',
      items: [
        {
          text: 'Quick Start',
          link: '/quick-start',
        },
        {
          text: 'Session data',
          link: '/session-data',
        },
        {
          text: 'Refresh token',
          link: '/refresh-token',
        },
      ],
    },
    {
      text: 'Advanced',
      base: '/guide/advanced',
      items: [
        {
          text: 'Middleware',
          collapsed: true,
          items: [
            { text: 'Global', link: '/middleware/global' },
            { text: 'Page', link: '/middleware/page' },
          ],
        },
        {
          text: 'Deployment',
          collapsed: true,
          items: [
            { text: 'Self-hosted', link: '/deployment/self-hosted' },
            { text: 'Vercel', link: '/deployment/vercel' },
            { text: 'Netlify', link: '/deployment/netlify' },
          ],
        },
        { text: 'Caching', link: '/caching' },
      ],
    },
  ],
}
