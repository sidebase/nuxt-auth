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

In 0.10.0 we spent a considerable amount of time reworking how @sidebase/nuxt-auth determine which endpoints to make requests to. If you would like to view the full PR and discussion, you can find it [here](https://github.com/sidebase/nuxt-auth/pull/913).

As a quick overview, @sidebase/nuxt-auth will now use the following logic to determine where to make requests to:
- 

## Changelog

* fix(#834): Do not refresh on window focus for unprotected pages by @YoshimiShima in https://github.com/sidebase/nuxt-auth/pull/858
* chore: add metadata fields to package.json by @MuhammadM1998 in https://github.com/sidebase/nuxt-auth/pull/864
* fix(#860): make node version requirement less strict by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/865
* docs: Add recipes section and copy old recipes by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/868
* chore: add plausible site analytics by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/869
* feat(#673, #523, #848): back-port authjs migration by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/849
* feat(#821): Unify `local` and `refresh` providers into one by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/822
* chore: updated ESLint and general housekeeping by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/853
* chore: update docs for `0.9.0` by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/873

**Full Changelog**: https://github.com/sidebase/nuxt-auth/compare/0.8.2...0.9.0
