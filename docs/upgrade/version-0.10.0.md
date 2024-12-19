# Upgrade to 0.10.0

> This release contains breaking changes for the default middleware and the configuration of `baseURL` and `AUTH_ORIGIN`

## Installation

::: code-group

```bash [npm]
npm i -D @sidebase/nuxt-auth@^0.10.0
```

```bash [pnpm]
pnpm i -D @sidebase/nuxt-auth^0.10.0
```

```bash [yarn]
yarn add --dev @sidebase/nuxt-auth^0.10.0
```

:::

## Breaking Changes

### Renaming of default middleware

In 0.10.0 we renamed the included middleware from `auth` to `sidebase-auth`. This is a quality of life change to allow developers to create their own custom middleware named `auth.global.ts` without conflicting with the provided middleware.

If you use the auth middleware inline on any of your pages you will need to rename it:

```vue diff
<script lang="ts" setup>
definePageMeta({
  middleware: 'auth', // [!code --]
  middleware: 'sidebase-auth', // [!code ++]
})
</script>

<template>
  Only I am protected!
</template>
```

### Adjustments to the computation of `baseURL` and `AUTH_ORIGIN`

In 0.10.0 we spent a considerable amount of time reworking how `@sidebase/nuxt-auth` determine which endpoints to make requests to. If you would like to view the full PR and discussion, you can find it [here](https://github.com/sidebase/nuxt-auth/pull/913).

As a quick overview, `@sidebase/nuxt-auth` will now use the following logic to determine where to make requests to:

#### 1. Environment variable and `runtimeConfig`

Use the `AUTH_ORIGIN` environment variable or `runtimeConfig.authOrigin` if set. Name can be customized, refer to [`originEnvKey`](/guide/application-side/configuration#originenvkey).

#### 2. `baseURL`

Use the static [`baseURL`](/guide/application-side/configuration#baseurl) inside the `nuxt.config.ts` if set.

#### 3. Automatically from the incoming `HTTP` request

When the server is running in **development mode**, NuxtAuth can automatically infer it from the incoming request.

---

Therefore as of version 0.10.0, we recommend the following setup to set your `AUTH_ORIGIN` or `baseURL`:

::: code-group

```ts diff [nuxt.config.ts]
export default defineNuxtConfig({
  // ...Previous configuration
  runtimeConfig: { // [!code ++]
    baseURL: '/api/auth' // [!code ++]
  }, // [!code ++]
  auth: {
    baseUrl: 'https://my-backend.com/api/auth', // [!code --]
    originEnvKey: 'NUXT_BASE_URL', // [!code ++]
  }
})
```

```env diff [.env]
NUXT_BASE_URL="https://my-backend.com/api/auth" // [!code ++]
```

:::

### Adjustments when using an external backend for the `local`-provider

In previous versions of `@sidebase/nuxt-auth` a very specific setup was needed to ensure that external backends could properly be used for the `local`-provider. In 0.10.0 we reworked the internal handling or urls to make it more consistent across providers and configurations. 

If you were previously using an external backend you can now make the following adjustments:

```ts diff
export default defineNuxtConfig({
  auth: {
    provider: {
      type: 'local',
      endpoints: {
        signIn: { path: 'login', method: 'post' }, // [!code --]
        signIn: { path: '/login', method: 'post' }, // [!code ++]
        getSession: { path: 'session', method: 'get' }, // [!code --]
        getSession: { path: '/session', method: 'get' }, // [!code ++]
      }
    }
  }
})
```

You can find a full overview of how `@sidebase/nuxt-auth`handles urls [here](https://github.com/sidebase/nuxt-auth/pull/913#issuecomment-2359137989).

## Changelog

* docs(fix): use correct process env variable for baseUrl by @felixranesberger in https://github.com/sidebase/nuxt-auth/pull/940
* enh(#895): Custom refresh response token pointer by @Rizzato95 in https://github.com/sidebase/nuxt-auth/pull/910
* feat(#797, #878): set `baseURL` via environment variables and improve internal url detection by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/913
* chore(#892): rename middleware to avoid conflicts by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/957
* enh(#935): allow external login page by @Thomas-Philippot in https://github.com/sidebase/nuxt-auth/pull/936
* release: 0.10.0-rc.1 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/958
* chore: upgrade to nitro 2.10, preparing for nitropack ecosystem switch from `nitropack` to `nitro` by @BracketJohn in https://github.com/sidebase/nuxt-auth/pull/942
* fix(#927): fix the warnings produced by Nuxt when awaiting runtime config by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/959
* release: 0.10.0-rc.2 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/960

**Full Changelog**: https://github.com/sidebase/nuxt-auth/compare/0.9.4...0.10.0
