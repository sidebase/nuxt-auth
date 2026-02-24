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
      'build/**',
      'playground-authjs/**',
      'examples/**',
      '*.config.*',
      '**/*.css',
    ],
  },
  ...mridangPlugin.configs.recommended,
  { plugins: { nuxt: nuxtPlugin } },
  {
    files: ['spec/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]
