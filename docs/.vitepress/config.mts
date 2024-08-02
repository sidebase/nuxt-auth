import { defineConfig } from 'vitepress'
import { routes as navRoutes } from './routes/navbar'
import { routes as sidebarRoutes } from './routes/sidebar'
import { headConfig } from './head'

export const HOST_NAME = 'https://auth.sidebase.io'

export default defineConfig({
  title: 'NuxtAuth',
  titleTemplate: ':title - by sidebase',
  description: 'Authentication for Nuxt 3',
  base: '/',
  cleanUrls: true,
  lang: 'en-US',
  appearance: 'dark',
  lastUpdated: true,
  head: headConfig,
  sitemap: {
    hostname: HOST_NAME,
  },
  themeConfig: {
    logo: '/lock.png',
    outline: { level: 'deep' },
    nav: navRoutes,
    sidebar: sidebarRoutes,
    socialLinks: [
      { icon: 'github', link: 'https://github.com/sidebase/nuxt-auth' },
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
    editLink: {
      pattern: 'https://github.com/sidebase/nuxt-auth/tree/main/docs/:path',
      text: 'Edit this page on GitHub'
    }
  },
})
