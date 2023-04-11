// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['../../src/module.ts'],
  auth: {
    backend: {
      type: 'local'
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
