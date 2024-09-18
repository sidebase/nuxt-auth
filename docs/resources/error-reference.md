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

`AUTH_NO_ORIGIN` will appear as a warning message during development and be thrown as an error that stops the application during production.
It is safe to ignore the development warning - it is only meant as a heads-up for your later production-deployment.

`AUTH_NO_ORIGIN` occurs when the origin of your application was not set.
NuxtAuth attempts to find the origin of your application in the following order ([source](https://github.com/sidebase/nuxt-auth/blob/9852116a7d3f3be56f6fdc1cba8bdff747c4cbb8/src/runtime/server/services/utils.ts#L8-L34)):

### 1. Environment variable and `runtimeConfig`

Use the `AUTH_ORIGIN` environment variable or `runtimeConfig.authOrigin` if set. Name can be customized, refer to [`originEnvKey`](/guide/application-side/configuration#originenvkey).

### 2. `baseURL`

The `origin` is computed using `ufo` from the provided `baseURL`. See implementation [here](https://github.com/sidebase/nuxt-auth/blob/9852116a7d3f3be56f6fdc1cba8bdff747c4cbb8/src/runtime/helpers.ts#L9-L23).

```ts
export default defineNuxtConfig({
  auth: {
    baseURL: `http://localhost:${process.env.PORT || 3000}`
  }
})
```

### 3. Development only: automatically from the incoming HTTP request

When the server is running in development mode, NuxtAuth can automatically infer it from the incoming request.

::: info
This is only done for your convenience - make sure to set a proper origin in production.
:::

---

If there is no valid `origin` after the steps above, `AUTH_NO_ORIGIN` error is thrown in production.
