// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  build: {
    transpile: ['jsonwebtoken']
  },
  modules: ['../src/module.ts'],
  auth: {
    backend: {
      type: 'local',
      endpoints: {
        getSession: { path: '/user' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseJsonPointerToToken: '/token/accessToken'
      }
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
