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

## Adapter

### Quick example

Here's a quick minimal example of an adapter. Only `signIn` and `getSession` endpoints are required:

```ts
export default defineHooksAdapter({
  signIn: {
    createRequest: (credentials) => ({
      path: '/auth/login',
      request: { method: 'post', body: credentials },
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
    onResponse: (response) => response._data ?? null,
  },
})
```

### In detail

A hooks provider expects the following adapter implementation for the auth endpoints:

```ts
export interface HooksAdapter {
  signIn: EndpointHooks
  getSession: EndpointHooks
  signOut?: EndpointHooks
  signUp?: EndpointHooks
  refresh?: EndpointHooks
}
```

Each `EndpointHooks` has two functions: `createRequest` and `onResponse`.

#### `createRequest(data, authState, nuxt)`

Prepare data for the fetch call.

Must return either an object:

```ts
{
  // Path to the endpoint
  path: string,
  // Request: body, headers, etc.
  request: NitroFetchOptions
}
```

or `false` to stop execution (no network call will be performed).

#### `onResponse(response, authState, nuxt)`

Handle the response and optionally instruct the module how to update state.

May return:
* `false` — stop further processing (module will not update auth state).
* `undefined` — proceed with default behaviour (e.g., the `signIn` flow will call `getSession` unless `signIn()` options say otherwise).
* `ResponseAccept` object — instruct the module what to set in `authState` (see below).
* Throw an `Error` to propagate a failure.

The `response` argument is the [`ofetch` raw response](https://github.com/unjs/ofetch?tab=readme-ov-file#-access-to-raw-response) that the module uses as well. `response._data` usually contains parsed body.

#### `ResponseAccept` shape (what `onResponse` can return)

When `onResponse` returns an object (the `ResponseAccept`), it can contain:

```ts
{
  token?: string | null,             // set or clear the access token in authState
  refreshToken?: string | null,      // set or clear the refresh token in authState (if refresh is enabled)
  session?: any | null               // set or clear the session object (when provided, `getSession` will NOT be called)
}
```

When `token` is provided (not omitted and not `undefined`) the module will set `authState.token` (or clear it when `null`).
Same applies for `refreshToken` when refresh was enabled.

When `session` is provided the module will use that session directly and will **not** call `getSession`.

When the `onResponse` hook returns `undefined`, the module may call `getSession` (depending on the flow) to obtain the session.

#### `authState` argument

This argument gives you access to the state of the module, allowing to read or modify session data or tokens.

#### `nuxt` argument

This argument is provided for your convenience and to allow using Nuxt context for invoking other composables. See the [Nuxt documentation](https://nuxt.com/docs/4.x/api/composables/use-nuxt-app) for more information.

### In short

* `createRequest` builds and returns `{ path, request }`. The module will call `_fetchRaw(nuxt, path, request)`.

* `onResponse` determines what the module should do next:
  * `false` — stop everything (useful when the hook itself handled redirects, cookies or state changes).
  * `undefined` — default behaviour (module may call `getSession`).
  * `{ token?, refreshToken?, session? }` — module will set provided tokens/session in `authState`.

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
* The default hooks shipped with the module try to extract tokens using the configured token pointers (`token.signInResponseTokenPointer`) and headers. Use hooks only when you need more customization.

