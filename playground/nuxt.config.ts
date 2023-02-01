export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  auth: {
    enableGlobalAppMiddleware: true,
    defaultProvider: undefined
  }
})
