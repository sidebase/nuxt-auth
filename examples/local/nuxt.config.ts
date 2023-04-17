export default defineNuxtConfig({
  build: {
    transpile: ['jsonwebtoken']
  },
  modules: ['../src/module.ts'],
  auth: {
    provider: {
      // @ts-ignore This layer will show a runtime-error when the other layer is loaded, as then type === 'local' is selected
      type: 'local',
      endpoints: {
        getSession: { path: '/user' }
      },
      pages: {
        login: '/'
      },
      token: {
        signInResponseTokenPointer: '/token/accessToken'
      }
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
