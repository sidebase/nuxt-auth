import NuxtAuth from '..'

export default defineNuxtConfig({
  // @ts-expect-error The config schema is (maybe?) too strictly matched, see https://github.com/nuxt/framework/issues/8931 for an issue that tracks this
  modules: [NuxtAuth],
  auth: {
    origin: 'http://localhost:3000'
  }
})
