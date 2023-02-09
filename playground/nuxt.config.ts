export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  // @ts-expect-error Doesn't detect `auth` config key any more since ca. Nuxt 3.1.2
  auth: {
    enableGlobalAppMiddleware: true
  }
})
