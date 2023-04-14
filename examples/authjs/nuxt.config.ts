export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  auth: {
    provider: {
      // @ts-ignore This layer will show a runtime-error when the other layer is loaded, as then type === 'local' is selected
      type: 'authjs'
    },
    globalAppMiddleware: {
      isEnabled: true
    }
  }
})
