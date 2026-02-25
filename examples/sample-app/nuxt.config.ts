import MyModule from '../../src/module'

export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  modules: [MyModule],
  auth: {
    provider: {
      type: 'authjs',
      trustHost: true,
    },
    baseURL: '/api/auth',
  },
})
