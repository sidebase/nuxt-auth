export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  auth: {
    provider: {
      type: 'authjs'
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
