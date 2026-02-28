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
    files: ['src/**/*.ts'],
    rules: {
      // This is a Vue/Nuxt project — disable React-specific rules that
      // false-positive on Nuxt composables like useState, useRouter, etc.
      'react-hooks/rules-of-hooks': 'off',
      'react-hooks/globals': 'off',
      // TypeScript function overloads are valid and handled by
      // @typescript-eslint/no-redeclare instead.
      'no-redeclare': 'off',
    },
  },
  {
    files: ['spec/**/*.ts'],
    rules: {
      'import/no-unresolved': 'off',
    },
  },
]
