export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  build: {
    transpile: ['jsonwebtoken']
  },
  auth: {
    provider: {
      type: 'refresh',
      endpoints: {
        getSession: { path: '/user' },
        refresh: { path: '/refresh', method: 'post' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/token/accessToken',
        maxAgeInSeconds: 15
      },
      refreshToken: {
        signInResponseRefreshTokenPointer: '/token/refreshToken'
      }
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
