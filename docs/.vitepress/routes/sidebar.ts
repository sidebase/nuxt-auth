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
      text: 'Application side',
      base: '/guide/application-side',
      items: [
        {
          text: 'Configuration',
          link: '/configuration',
        },
        {
          text: 'Session access',
          link: '/session-access',
        },
        {
          text: 'Protecting pages',
          link: '/protecting-pages',
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
        {
          text: 'Server side',
          collapsed: true,
          items: [
            { text: 'Session access', link: '/server-side/session-access' },
            { text: 'JWT access', link: '/server-side/jwt-access' },
            { text: 'Rest API', link: '/server-side/rest-api' },
          ],
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
        }
      ],
    },
    {
      text: 'Advanced',
      base: '/guide/advanced',
      items: [
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
