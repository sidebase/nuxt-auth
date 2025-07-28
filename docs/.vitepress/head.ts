import type { HeadConfig } from 'vitepress'

const HOST_NAME = 'https://auth.sidebase.io'
const OG_IMAGE_URL = `${HOST_NAME}/nuxt-auth-og.jpg`

export const sitemapConfig = {
  hostname: HOST_NAME,
}

export const headConfig: HeadConfig[] = [
  ['link', { rel: 'icon', href: '/favicon.ico' }],
  ['meta', { name: 'theme-color', content: '#30A36C' }],
  ['meta', { property: 'og:title', content: 'NuxtAuth | Authentication for Nuxt 4' }],
  ['meta', { property: 'og:description', content: 'User authentication and sessions via authjs' }],
  ['meta', { property: 'og:site_name', content: 'NuxtAuth' }],
  ['meta', { property: 'og:type', content: 'website' }],
  ['meta', { property: 'og:locale', content: 'en' }],
  ['meta', { property: 'og:image', content: OG_IMAGE_URL }],
  ['meta', { property: 'og:url', content: HOST_NAME }],
  ['script', { 'src': 'https://plausible.io/js/script.js', 'data-domain': 'auth.sidebase.io', 'defer': '' }]
]
