import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/*.spec.ts', 'spec/*.spec.ts', 'test/*.test.ts'],
    testTimeout: 60000,
    reporters: ['default', 'junit'],
    outputFile: {
      junit: './build/reports/junit.xml',
    },
    coverage: {
      reportsDirectory: './build/coverage',
    },
  },
})
