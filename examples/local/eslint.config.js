import antfu from '@antfu/eslint-config'

const ignores = [
  '.nuxt',
  '**/.nuxt/**',
  '.output',
  '**/.output/**',
  'node_modules',
  '**/node_modules/**',
  'public',
  '**/public/**',
]

export default antfu({
  // .eslintignore is no longer supported in Flat config, use ignores instead
  ignores,

  // Stylistic formatting rules
  stylistic: {
    indent: 2,
    quotes: 'single',
  },

  // TypeScript and Vue are auto-detected, you can also explicitly enable them
  typescript: true,
  vue: true,

  // Disable jsonc and yaml support
  jsonc: false,
  yaml: false,

  // Overwrite certain rules to your preference
  rules: {
    'no-console': ['error', {
      allow: ['info', 'warn', 'trace', 'error', 'group', 'groupEnd'],
    }],
    'style/comma-dangle': 'off',
    'curly': ['error', 'all'],
    'node/prefer-global/process': ['error', 'always'],
  },
})
