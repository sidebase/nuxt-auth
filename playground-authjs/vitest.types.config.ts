import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [],
    typecheck: {
      enabled: true,
      only: true,
      // Check only type assertions, ignore errors outside tests
      ignoreSourceErrors: true,
      include: ['tests/types/**/*.test-d.ts'],
      tsconfig: './tsconfig.types.json'
    }
  }
})
