export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  auth: {
    backend: {
      type: 'authjs'
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
