export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  auth: {
    enableGlobalAppMiddleware: false,
    defaultProvider: undefined
  }
})
