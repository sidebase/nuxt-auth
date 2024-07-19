// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

// Styles
import './style.css'

// Custom Components
import GithubStarsButton from './components/GithubStarsButton.vue'
import Banner from './components/Banner.vue'

// Configuration
const bannerConfig = {
  // Leave text empty to disable the banner
  text: '⚠️ You are viewing the docs for NuxtAuth v1.0.0 ⚠️',
  button: {
    href: '/resources/migrations/1.0.0',
    text: 'View migration guide'
  }
}

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'nav-bar-content-after': h(GithubStarsButton, { owner: 'sidebase', repo: 'nuxt-auth' }),
      'home-hero-before': h(Banner, bannerConfig)
    })
  },
} satisfies Theme
