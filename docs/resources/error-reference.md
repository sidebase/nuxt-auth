# Error and warnings

This is a list of errors & warnings that NuxtAuth throws, what each of them means and how you can resolve them.

## AUTH_NO_SECRET

`AUTH_NO_SECRET` will appear as a warning message during development and be thrown as an error that stops the application during production. It is safe to ignore the development warning - it is only meant as a heads-up for your later production-deployment. `AUTH_NO_SECRET` occurs when no secret was set inside the NuxtAuthHandler:

```ts
// file: ~/server/api/auth/[...].ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  secret: 'my-superb-secret' // <--- !!!! THIS IS WHAT'S MISSING

  // ... rest of your config
})
```

## AUTH_NO_ORIGIN

`AUTH_NO_ORIGIN` will appear as a warning message during development and be thrown as an error that stops the application during production. It is safe to ignore the development warning - it is only meant as a heads-up for your later production-deployment. `AUTH_NO_ORIGIN` occurs when the origin of your application was not set. NuxtAuth tries to find the origin of your application in the following order:

1. Use the `NUXT_AUTH_ORIGIN` environment variable if it is set
2. Development only: Determine the origin automatically from the incoming HTTP request

The `origin` is important for callbacks that happen to a specific origin for `oauth` flows. Note that in order for (2) to work the `origin` already has to be set at build-time, i.e., when you run `npm run build` or `npm run generate` and it will lead to the `origin` being inside your app-bundle.

```ts
// file: nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    authOrigin: 'https://example.org', // You can either set a default or leave it empty
  }

  // ... rest of your config
})
```
