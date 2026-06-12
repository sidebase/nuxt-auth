import { vi } from 'vitest'

export const useRuntimeConfig = vi.fn(() => ({
  public: {
    auth: {
      baseURL: 'http://localhost:3000/api/auth',
      disableInternalRouting: false,
      originEnvKey: '',
      provider: {
        type: 'authjs',
        trustHost: false,
      },
    },
  },
}))
