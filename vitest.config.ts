import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts', 'spec/*.spec.ts', 'test/*.test.ts'],
    exclude: ['tests/**/*.nuxt.spec.ts'],
    testTimeout: 60000,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './build/reports/junit.xml',
    },
    coverage: {
      enabled: true,
      reportsDirectory: './build/coverage',
      reporter: ['clover', 'cobertura', 'lcov'],
      include: ['src/**/*.{ts,tsx,js,jsx}'],
      exclude: ['src/**/*.d.ts'],
    },
  },
})
