// https://vitepress.dev/guide/custom-theme
import { h } from 'vue'
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import GithubButton from 'vue-github-button'

import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      'home-hero-info-before': h(GithubButton, {
        href: 'https://github.com/sidebase/nuxt-auth',
        dataShowCount: true,
        dataSize: 'large',
      }, 'Star'),
    })
  },
} satisfies Theme
