import NuxtAuth from '..'

export default defineNuxtConfig({
  modules: [NuxtAuth],
  auth: {
    origin: 'http://localhost:3000'
  }
})
