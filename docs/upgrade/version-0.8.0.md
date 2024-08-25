# Upgrade to 0.8.0

> This release contains breaking changes for **all providers**.

## Installation

::: code-group

```bash [npm]
npm i -D @sidebase/nuxt-auth@^0.8.0
```

```bash [pnpm]
pnpm i -D @sidebase/nuxt-auth^0.8.0
```

```bash [yarn]
yarn add --dev @sidebase/nuxt-auth^0.8.0
```

:::

## Breaking Changes

- `auth.session` renamed to `auth.sessionRefresh`

```ts
// nuxt.config.ts

export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    session: { // [!code --]
      enableRefreshOnWindowFocus: true, // [!code --]
      enableRefreshPeriodically: 10000, // [!code --]
    }, // [!code --]
    sessionRefresh: { // [!code ++]
      enableOnWindowFocus: true, // [!code ++]
      enablePeriodically: 10000, // [!code ++]
    }, // [!code ++]
  }
})
```

## RefreshHandler

In [#715](https://github.com/sidebase/nuxt-auth/pull/715), we took the first step to improve the behavior and possibilities to customize the Refresh behaviour of your application. In [#766](https://github.com/sidebase/nuxt-auth/pull/766) we finalized these changes and improved the previous configuration options. You can define the location of a custom RefreshHandler inside your Nuxt config under `auth.sessionRefresh.refreshHandler`.

To customize the session refreshing you can provide a refresh handler. A custom `RefreshHandler` requires an `init`- and a `destroy`-function.

- `init` will be called when the nuxt application is mounted. Here you may add event listeners and initialize custom refresh behaviour. The method will receive a `RefreshHandlerConfig`. The type consists of `enablePeriodically` & `enableOnWindowFocus`.
- `destroy` will be called when your app is unmounted. Here you may run your clean up routine e.g. to remove your event listeners.

```ts
import type { RefreshHandler } from '@sidebase/nuxt-auth'

// You may also use a plain object with `satisfies RefreshHandler`, of course!
class CustomRefreshHandler implements RefreshHandler {
  init(): void {
    console.info('Use the full power of classes to customize refreshHandler!')
  }

  destroy(): void {
    console.info(
      'Hover above class properties or go to their definition '
      + 'to learn more about how to craft a refreshHandler'
    )
  }
}

export default new CustomRefreshHandler()
```

## Changelog

* Feature: Option to remove server side auth by @KyleSmith0905 in https://github.com/sidebase/nuxt-auth/pull/610
* docs: Added documentation for automatic session refresh by @Hiimphteve in https://github.com/sidebase/nuxt-auth/pull/739
* docs: Adjusted Recommended NextAuth Version by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/741
* fix: fix and improve auto-declaration generation by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/747
* feat: Add cookie domain config by @pier-lucRVezy in https://github.com/sidebase/nuxt-auth/pull/736
* fix(types): export interface for module builder type generation by @BobbieGoede in https://github.com/sidebase/nuxt-auth/pull/738
* enh(#742): optimize internal $fetch calls by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/750
* release: 0.8.0-alpha.1 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/752
* fix: opt in to `import.meta.*` properties by @danielroe in https://github.com/sidebase/nuxt-auth/pull/719
* [PR changes #392] feat: move pointer and sessionDataType to the SessionConfig by @valh1996 in https://github.com/sidebase/nuxt-auth/pull/592
* feat: Add support for secure attribute of local/refresh provider cookies by @matteioo in https://github.com/sidebase/nuxt-auth/pull/729
* fix: don't send sign-in options in request payload by @despatates in https://github.com/sidebase/nuxt-auth/pull/755
* fix: fix type generation being faulty by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/756
* feat: Add support for custom refresh handling by @blumewas in https://github.com/sidebase/nuxt-auth/pull/715
* release: 0.8.0-alpha.2 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/757
* 📝 docs: add session config.md by @blumewas in https://github.com/sidebase/nuxt-auth/pull/758
* docs: fix broken links and minor rewording by @morehawes in https://github.com/sidebase/nuxt-auth/pull/767
* enh(#765): refactor `refreshHandler` and session refreshing; fix refresh provider refreshing by @phoenix-ru in https://github.com/sidebase/nuxt-auth/pull/766
* fix: await sendRedirect in auth handler by @DavidDeSloovere in https://github.com/sidebase/nuxt-auth/pull/769
* fix: Added getCurrentInstance check to conditionally register onMounted in useAuthState. by @cip8 in https://github.com/sidebase/nuxt-auth/pull/771
* release: 0.8.0-alpha.3 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/778
* fix: properly disable `getSession` endpoint for local and refresh by @Armillus in https://github.com/sidebase/nuxt-auth/pull/768
* fix: addDefaultCallback can be set with refresh and local providers by @nojiritakeshi in https://github.com/sidebase/nuxt-auth/pull/710
* release: 0.8.0-rc.1 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/779
* Revert "fix: properly disable `getSession` endpoint for local and refresh" by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/788
* release: 0.8.0 by @zoey-kaiser in https://github.com/sidebase/nuxt-auth/pull/789

**Full Changelog**: https://github.com/sidebase/nuxt-auth/compare/0.7.2...0.8.0
