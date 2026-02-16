export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  modules: ['../src/module.ts'],
  auth: {
    provider: {
      type: 'authjs',
      trustHost: true,
    },
    globalAppMiddleware: {
      isEnabled: true,
    },
    baseURL: '/api/auth',
  },
  routeRules: {
    '/with-caching': {
      swr: 86400000,
      auth: {
        disableServerSideAuth: true,
      },
    },
  },
})
