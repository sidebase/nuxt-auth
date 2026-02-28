import { fileURLToPath } from 'node:url'
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['tests/**/*.nuxt.spec.ts'],
    testTimeout: 60000,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './build/reports/junit-nuxt.xml',
    },
    coverage: {
      enabled: true,
      reportsDirectory: './build/coverage',
      reporter: ['clover', 'cobertura', 'lcov'],
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['src/**/*.d.ts'],
    },
    environmentOptions: {
      nuxt: {
        rootDir: fileURLToPath(new URL('./playground-authjs', import.meta.url)),
      },
    },
  },
})
