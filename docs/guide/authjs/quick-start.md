# AuthJS Quickstart

This guide is for setting up `@sidebase/nuxt-auth` with the AuthJS Provider, which is best suited for plug-and-play OAuth for established oauth-providers or magic-url based sign-ins.

## Installation

If you want to use the AuthJS provider, you have to install `next-auth`. With all package managers except npm you must manually install the peer dependency alongside nuxt-auth:

::: code-group

```bash [pnpm]
pnpm i next-auth@4.21.1
```

```bash [yarn]
yarn add next-auth@4.21.1
```

::: warning
Due to a breaking change in NextAuth, nuxt-auth is only compoatible with NextAuth versions under v4.23.0. We recommend pinning the version to `4.21.1`. Read more [here](https://github.com/sidebase/nuxt-auth/issues/514).
:::

## Configuration

After installing `@sidebase/nuxt-auth` and `next-auth`, you can now configure NuxtAuth to use the AuthJS provider. Inside your `nuxt.config.ts` add the following configuration:

```ts
export default defineNuxtConfig({
    modules: ['@sidebase/nuxt-auth'],
    auth: {
        provider: {
            type: 'authjs'
        }
    }
})
```

Afterwards create your own NuxtAuthHandler under `~/server/api/auth/[...].ts`. Inside the NuxtAuthHandler you can configure the authentication provider you want to use, how the JWT Token is created and managed as well as how your sessions will be composed. The NuxtAuthHander will automaticlly create all required API endpoints to handle authentication inside your application.
