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
        maxAgeInSeconds: 60 * 5 // 5 min
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
