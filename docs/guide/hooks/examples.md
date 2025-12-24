# Hooks Provider examples

Note that examples here are intentionally simple to demonstrate the basics of how hooks work. For a complete example using all possible hooks and [Zod](https://zod.dev/) for validating the backend responses, refer to [playground-hooks demo](https://github.com/sidebase/nuxt-auth/blob/e2bda5784ddd325644fb8d73d0063b3cdf4b92b1/playground-hooks/config/hooks.ts).

## Basic `signIn` hook (body-based tokens)

This as an example for when your authentication backend uses POST Body to receive the credentials and tokens and to send session.

```ts
import { defineHooks } from '#imports'

export default defineHooks({
  signIn: {
    createRequest({ credentials }) {
      return {
        path: '/auth/login',
        request: {
          method: 'post',
          body: credentials,
        },
      }
    },

    onResponse(response) {
      // Backend returns { access: 'xxx', refresh: 'yyy', user: {...} }
      const body = response._data
      // Default to `undefined` to not reset the tokens and session (but you may want to reset it)
      return {
        token: body?.access ?? undefined,
        refreshToken: body?.refresh ?? undefined,
        session: body?.user ?? undefined,
      }
    },
  },

  getSession: {
    createRequest(_getSessionOptions, authState) {
      // Avoid calling `getSession` if no access token is present
      if (authState.token.value === null) {
        return false
      }
      // Call `/auth/profile` with the method of POST
      // and access token sent via Body as { token }
      return {
        path: '/auth/profile',
        request: {
          method: 'post',
          body: { token: authState.token.value },
        },
      }
    },

    onResponse(response) {
      return {
        session: response._data ?? null,
      }
    },
  },
})
```

## Tokens returned in headers

This example demonstrates how to communicate with your authentication backend using headers.

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
      // Don't return session — trigger a getSession call.
      // Default to `undefined` to not reset the tokens.
      return { token: access ?? undefined, refreshToken: refresh ?? undefined }
    },
  },

  getSession: {
    createRequest(_getSessionOptions, authState) {
      // Avoid calling `getSession` if no access token is present
      if (authState.token.value === null) {
        return false
      }
      // Call `/auth/profile` with the method of GET
      // and access token added to `Authorization` header
      return {
        path: '/auth/profile',
        request: {
          method: 'get',
          headers: {
            Authorization: `Bearer ${authState.token.value}`,
          },
        },
      }
    },
    onResponse: response => ({ session: response._data ?? null }),
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
  },
  // ...
})
```

## My server returns HTTP-Only cookies

You are already almost set in this case - your browser will automatically send cookies with each request,
as soon as the cookies were configured with the correct domain and path on your server (as well as CORS).
NuxtAuth will use `getSession` to query your server - this is how your application will know the authentication status.

Please also note that `authState` will not have the tokens available in this case.

The correct way forward for you looks like this (simplified):

```ts
export default defineHooks({
  // signIn: ...

  getSession: {
    createRequest() {
      // Always call `getSession` as the module cannot see
      // the tokens stored inside HTTP-Only cookies

      // Call `/auth/profile` with the method of GET
      // and no tokens provided - rely on browser including them
      return {
        path: '/auth/profile',
        request: {
          method: 'get',
          // Explicitly include credentials to force browser to send cookies
          credentials: 'include',
        },
      }
    },
    onResponse: response => ({ session: response._data ?? null }),
  },
  // ...
})
```
