// https://vitepress.dev/guide/custom-theme
import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'

// Styles
import './style.css'

export default { extends: DefaultTheme, Layout } satisfies Theme
