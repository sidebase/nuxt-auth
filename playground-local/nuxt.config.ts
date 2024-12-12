export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  modules: ['../src/module.ts'],
  build: {
    transpile: ['jsonwebtoken']
  },
  auth: {
    provider: {
      type: 'local',
      endpoints: {
        getSession: { path: '/user' },
        signUp: { path: '/signup', method: 'post' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/token/accessToken'
      },
      session: {
        dataType: { id: 'string', email: 'string', name: 'string', role: '\'admin\' | \'guest\' | \'account\'', subscriptions: '{ id: number, status: \'ACTIVE\' | \'INACTIVE\' }[]' },
        dataResponsePointer: '/'
      },
      refresh: {
        // This is usually a static configuration `true` or `false`.
        // We do an environment variable for E2E testing both options.
        isEnabled: process.env.NUXT_AUTH_REFRESH_ENABLED !== 'false',
        endpoint: { path: '/refresh', method: 'post' },
        token: {
          signInResponseRefreshTokenPointer: '/token/refreshToken',
          refreshResponseTokenPointer: '',
          refreshRequestTokenPointer: '/refreshToken'
        },
      }
    },
    sessionRefresh: {
      // Whether to refresh the session every time the browser window is refocused.
      enableOnWindowFocus: true,
      // Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.
      enablePeriodically: 5000,
      // Custom refresh handler - uncomment to use
      // handler: './config/AuthRefreshHandler'
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  },
  routeRules: {
    '/with-caching': {
      swr: 86400000,
      auth: {
        disableServerSideAuth: true
      }
    }
  }
})
