# Hooks provider

The Hooks Provider is an advanced and highly flexible provider intended for use with external authentication backends.

Its main difference with Local Provider is that it does not ship any default implementation and instead relies on you providing an adapter for communicating with your backend. You get complete control over how requests are built and how responses are used.

## Configuration

In `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  auth: {
    provider: {
      type: 'hooks',
      adapter: '~/app/nuxt-auth-adapter.ts',
    },
  },
})
````

The path should point to a file that exports an adapter implementing `Hooks`.

## Adapter quick example

Here's a quick minimal example of an adapter. Only `signIn` and `getSession` endpoints are required:

```ts
import { defineHooksAdapter } from '@sidebase/nuxt-auth'

export default defineHooksAdapter({
  signIn: {
    createRequest: signInData => ({
      path: '/auth/login',
      request: { method: 'post', body: signInData.credentials },
    }),

    onResponse: (response) => {
      // Backend returns { access: 'xxx', refresh: 'yyy', user: {...} }
      const body = response._data
      return {
        token: body?.access ?? undefined,
        refreshToken: body?.refresh ?? undefined,
        session: body?.user ?? undefined,
      }
    },
  },

  getSession: {
    createRequest: () => ({
      path: '/auth/profile',
      request: { method: 'get' }
    }),
    onResponse: response => response._data ?? null,
  },
})
```

To see more information about setting up your adapter, please refer to [its dedicated page](./adapter.md).
See the [examples page](./examples.md) to get some inspiration.

## Pages

Configure the path of the login-page that the user should be redirected to, when they try to access a protected page without being logged in. This page will also not be blocked by the global middleware.

```ts
export default defineNuxtConfig({
  // previous configuration
  auth: {
    provider: {
      type: 'hooks',
      pages: {
        login: '/login'
      }
    }
  }
})
```

## Some tips

* When your backend uses **HTTP-only cookies** for session management, prefer returning `undefined` from `onResponse` — browsers will automatically include cookies; the module will call `getSession` to obtain the user object when needed.
* If your backend is cross-origin, remember to configure CORS and allow credentials:

  * `Access-Control-Allow-Credentials: true`
  * `Access-Control-Allow-Origin: <your-front-end-origin>` (cannot be `*` when credentials are used)
