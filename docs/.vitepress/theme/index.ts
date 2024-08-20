// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './components/Layout.vue'

// Styles
import './style.css'

// Components
import RecipeHeader from './components/RecipeHeader.vue'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('RecipeHeader', RecipeHeader)
  }
} satisfies Theme
