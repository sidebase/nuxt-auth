export default defineNuxtConfig({
  modules: ["../src/module.ts"],
  auth: {
    provider: {
      type: "authjs",
    },
    globalAppMiddleware: {
      isEnabled: true,
    },
    baseURL: "http://localhost:3001",
  },
  routeRules: {
    "/with-caching": {
      swr: 86400000,
      auth: {
        disableServerSideAuth: true,
      },
    },
  },
});
