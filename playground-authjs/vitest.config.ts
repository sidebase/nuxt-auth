import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      {
        resolve: {
          alias: {
            '#imports': fileURLToPath(new URL('./tests/mocks/imports.ts', import.meta.url)),
          },
        },
        test: {
          name: 'server',
          include: ['tests/nuxt/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
    ],
  }
})
