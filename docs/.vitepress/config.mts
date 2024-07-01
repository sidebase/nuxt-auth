import { defineConfig } from 'vitepress'
import { routes as navRoutes } from './routes/navbar'
import { routes as sidebarRoutes } from './routes/sidebar'

export default defineConfig({
  title: 'NuxtAuth',
  titleTemplate: ':title - by sidebase',
  description: 'The productive way to build fullstack Nuxt 3 applications.',
  lang: 'en-US',
  appearance: 'dark',
  lastUpdated: true,
  head: [['link', { rel: 'icon', href: '/favicon.ico' }]],
  themeConfig: {
    logo: '/icon.svg',
    nav: navRoutes,
    sidebar: sidebarRoutes,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sidebase' },
      { icon: 'x', link: 'https://twitter.com/sidebase_io' },
      { icon: 'discord', link: 'https://discord.gg/VzABbVsqAc' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Developed by SIDESTREAM',
    },
    search: {
      provider: 'local',
    },
  },
})
