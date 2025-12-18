# Hooks Provider examples

## Basic `signIn` hook (body-based tokens)

```ts
import { defineHooks } from '#imports'

export default defineHooks({
  signIn: {
    async createRequest({ credentials }) {
      return {
        path: '/auth/login',
        request: {
          method: 'post',
          body: credentials,
        },
      }
    },

    async onResponse(response) {
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
    async createRequest() {
      return {
        path: '/auth/profile',
        request: {
          method: 'get',
        },
      }
    },

    async onResponse(response) {
      return response._data ?? null
    },
  },
})
```

## Tokens returned in headers

```ts
export default defineHooks({
  signIn: {
    createRequest: ({ credentials }) => ({
      path: '/auth/login',
      request: { method: 'post', body: credentials },
    }),

    onResponse: (response) => {
      const access = response.headers.get('x-access-token')
      const refresh = response.headers.get('x-refresh-token')
      // Don't return session — trigger a getSession call
      return { token: access ?? undefined, refreshToken: refresh ?? undefined }
    },
  },

  getSession: {
    createRequest: () => ({ path: '/auth/profile', request: { method: 'get' } }),
    onResponse: response => response._data ?? null,
  },
})
```

## Fully hijacking the flow

If your hook performs a redirect itself or sets cookies, you can stop the default flow by returning `false`:

```ts
defineHooksAdapter<Session>({
  signIn: {
    createRequest: data => ({ path: '/auth/login', request: { method: 'post', body: data.credentials } }),
    async onResponse(response, authState, nuxt) {
      // Handle everything yourself
      authState.data.value = {}
      authState.token.value = ''
      // ...

      return false
    }
  }
})
```
