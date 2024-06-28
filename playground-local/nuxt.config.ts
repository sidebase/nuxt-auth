export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  build: {
    transpile: ['jsonwebtoken']
  },
  auth: {
    provider: {
      type: 'local',
      endpoints: {
        getSession: { path: '/user' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/token/accessToken'
      },
      session: {
        dataType: { id: 'string', email: 'string', name: 'string', role: "'admin' | 'guest' | 'account'", subscriptions: "{ id: number, status: 'ACTIVE' | 'INACTIVE' }[]" },
        dataResponsePointer: '/'
      }
    },
    sessionRefresh: {
      // Whether to refresh the session every time the browser window is refocused.
      enableOnWindowFocus: true,
      // Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists.
      enablePeriodically: 5000
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
