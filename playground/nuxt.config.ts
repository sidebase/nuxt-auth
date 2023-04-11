export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  auth: {
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
