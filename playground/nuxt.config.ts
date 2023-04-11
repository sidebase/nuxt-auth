export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  ssr: false,
  auth: {
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
