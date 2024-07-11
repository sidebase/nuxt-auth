// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'

// Styles
import './style.css'

// Custom Components
import GithubStarsButton from './components/GithubStarsButton.vue'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      'nav-bar-content-after': h(GithubStarsButton, { owner: 'sidebase', repo: 'nuxt-auth' })
    })
  },
} satisfies Theme
