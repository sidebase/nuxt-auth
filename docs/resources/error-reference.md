# Errors and warnings

This is a list of errors & warnings that NuxtAuth throws, what each of them means and how you can resolve them.

## AUTH_NO_SECRET

`AUTH_NO_SECRET` will appear as a warning message during development and be thrown as an error that stops the application during production. It is safe to ignore the development warning - it is only meant as a heads-up for your later production-deployment. `AUTH_NO_SECRET` occurs when no secret was set inside the NuxtAuthHandler:

```ts
// file: ~/server/api/auth/[...].ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  secret: 'my-superb-secret', // This is missing // [!code ++]

  // ... rest of your config
})
```

## AUTH_NO_ORIGIN

`AUTH_NO_ORIGIN` will appear as a warning message during development and be thrown as an error that stops the application during production.
It is safe to ignore the development warning - it is only meant as a heads-up for your later production-deployment.

`AUTH_NO_ORIGIN` occurs when the authentication base URL of your application was not set.

For a detailed guide on pathing logic, refer to its [dedicated page](../guide/advanced/url-resolutions.md).

The simplest way to fix this error is by providing `auth.baseUrl` in your `nuxt.config.ts`:

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  auth: {
    baseUrl: 'https://example.com/api/auth', // [!code ++]
  },
  // ... other configuration
})
```

For setting your authentication base URL dynamically, refer to [Changing `baseURL`](../guide/advanced/url-resolutions.md#changing-baseurl).
