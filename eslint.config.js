import mridangPlugin from '@mridang/eslint-defaults'
import nuxtPlugin from '@nuxt/eslint-plugin'

export default [
  {
    ignores: [
      '.nuxt/**',
      '.output/**',
      '.out/**',
      'dist/**',
      'docs/**',
      'playground-authjs/**',
      '*.config.*',
    ],
  },
  ...mridangPlugin.configs.recommended,
  { plugins: { nuxt: nuxtPlugin } },
]
