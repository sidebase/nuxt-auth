export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  build: {
    transpile: ['jsonwebtoken']
  },
  auth: {
    provider: {
      type: 'refresh',
      // refreshOnlyToken: true,
      endpoints: {
        getSession: { path: '/user' },
        refresh: { path: '/refresh', method: 'post' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/token/accessToken',
        maxAgeInSeconds: 60 * 5, // 5 min
        sameSiteAttribute: 'lax'
      },
      refreshToken: {
        signInResponseRefreshTokenPointer: '/token/refreshToken',
        refreshRequestTokenPointer: '/refreshToken'
      }
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
