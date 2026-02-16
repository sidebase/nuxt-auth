import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/*.spec.ts', 'spec/*.spec.ts'],
    testTimeout: 60000,
  },
})
