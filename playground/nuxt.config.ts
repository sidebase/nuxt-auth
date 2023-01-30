import NuxtAuth from '..'

export default defineNuxtConfig({
  modules: [NuxtAuth],
  auth: {
    enableGlobalAppMiddleware: true,
    defaultProvider: undefined
  }
})
