import NuxtAuth from '..'

export default defineNuxtConfig({
  // @ts-expect-error See https://github.com/nuxt/framework/issues/8931
  modules: [NuxtAuth],
  auth: {
    enableGlobalAppMiddleware: true,
    defaultProvider: undefined
  }
})
