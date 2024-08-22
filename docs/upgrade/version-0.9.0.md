# Upgrade to 0.9.0

> This release contains breaking changes for the **`refresh` provider**.

## Installation

::: code-group

```bash [npm]
npm i -D @sidebase/nuxt-auth@^0.9.0
```

```bash [pnpm]
pnpm i -D @sidebase/nuxt-auth^0.9.0
```

```bash [yarn]
yarn add --dev @sidebase/nuxt-auth^0.9.0
```

:::

## Breaking Changes

### Unification of `local` and `refresh` provider

In `0.9.0` we unified the `local` and `refresh` providers into one. When we originally developed NuxtAuth, there was a lot of split logic, that could not be reused. Since then we unified many functions together which now allows us to build the `local` and `refresh` providers from the same base.

This update will streamline additions to the providers, as changes made will automatically be reflected in both providers, unlike before, where changes needed to be added to both the `local` and `refresh` provider.

Below you can see what changes need to be made to upgrade to `0.9.0` if you were previusly using the `refresh` provider. If you were using the `local` or `authjs` provider, you don't need to make any adjustments:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    provider: {
      type: 'refresh', // [!code --]
      type: 'local', // [!code ++]
      endpoints: {
        getSession: { path: '/session', method: 'get' },
        refresh: { path: '/refresh', method: 'post' } // [!code --]
      },
      refreshOnlyToken: true, // [!code --]
      refreshToken: { // [!code --]
        signInResponseRefreshTokenPointer: '/refresh-token', // [!code --]
        refreshRequestTokenPointer: 'Bearer', // [!code --]
        cookieName: 'auth.token', // [!code --]
        maxAgeInSeconds: 1800, // [!code --]
        cookieDomain: 'sidebase.io', // [!code --]
        secureCookieAttribute: false, // [!code --]
        httpOnlyCookieAttribute: false, // [!code --]
      }, // [!code --]
      refresh: { // [!code ++]
        isEnabled: true, // [!code ++]
        endpoint: { path: '/refresh', method: 'POST' }, // [!code ++]
        refreshOnlyToken: true, // [!code ++]
        token: { // [!code ++]
          signInResponseRefreshTokenPointer: '/refresh-token', // [!code ++]
          refreshRequestTokenPointer: 'Bearer', // [!code ++]
          cookieName: 'auth.token', // [!code ++]
          maxAgeInSeconds: 1800, // [!code ++]
          sameSiteAttribute: 'lax', // [!code ++]
          secureCookieAttribute: false, // [!code ++]
          cookieDomain: 'sidebase.io', // [!code ++]
          httpOnlyCookieAttribute: false, // [!code ++]
        } // [!code ++]
      },
    },
  }
})
```

The configuration values that were unquie to the `refresh` provider have now been moved into one `refresh` configuration inside the `local` provider. `refreshToken` was also renamed to `token`, as it now resides inside a `refresh` configuration point.

### Node version requirement

Starting from `v0.9.0`, we now require a node version of at least 20. Node version 16 has now left maintaince mode and support for version 18 is ending in 2025. Read more [here](https://nodejs.org/en/about/previous-releases).
