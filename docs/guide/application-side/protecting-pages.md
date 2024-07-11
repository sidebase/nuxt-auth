---
outline: 'deep'
---

# Protecting Pages

NuxtAuth offers different approaches to protect pages:

- **Global middleware:** Protects all pages with manual exceptions
- **Local middleware:** Protects specific pages
- **Custom middleware:** Create your own middleware

## Global Middleware

To enable the global middleware on your application, you can configure the middleware inside the `nuxt.config.ts`.

```ts
export default defineNuxtConfig({   
    modules: ['@sidebase/nuxt-auth'],
    auth: {
        globalAppMiddleware: true
    }
})
```

If you like to further customize the global middleware, you can pass an object of configurations to `globalAppMiddleware`. See the API reference here.

### Disabling the Global Middleware

If the global middleware is disabled, you can manually add the middleware to individual pages. This is only available if the global middleware is disabled, as you will get an error along the lines of `Error: Unknown route middleware: 'auth'`. This is because the auth middleware is then added globally and not available to use as a local, page-specific middleware.

```vue
<script lang="ts" setup>
definePageMeta({ middleware: 'auth' })
</script>

<template>
    Only I am protected!
</template>
```

## Local Middleware

To locally enable or disable the middleware on a single page, you can use the [`definePageMeta`](https://nuxt.com/docs/api/utils/define-page-meta) macro to set the authentication metadata for a single page.

```vue
<script setup lang="ts">
definePageMeta({
    auth: false
})
</script>

<template>
    I am not protected anymore!
</template>
```

### Middleware options

`auth` can be either a boolean or an object of further middleware configurations. 

```vue
<script setup lang="ts">
definePageMeta({
    unauthenticatedOnly: false,
    navigateUnauthenticatedTo: '/auth/signin'
})
</script>

<template>
    I am protected with a custom redirect!
</template>
```

#### `unauthenticatedOnly`

Whether to only allow unauthenticated users to access this page. Authenticated users will be redirected to / or the route defined in `navigateAuthenticatedTo`.

:::tip
Setting `unauthenticatedOnly: false` is equivalent to setting `auth: false` from the user perspective, but requires some extra middleware steps, so it is a bit less efficient. Therefore it is recommended to use `auth: false` instead.
:::

#### `navigateAuthenticatedTo`

Where to redirect authenticated users if `unauthenticatedOnly` is set to `true`.

#### `navigateUnauthenticatedTo`

Where to redirect unauthenticated users if this page is protected.

### Guest mode

You can use NuxtAuth to setup pages that are accessible only when the user **is not logged in**. This is sometimes called _"guest mode"_. The behavior of such a page is as follows:

- A logged in user visits the page -> redirect to another (likely protected) page,
- A logged out user visits the page -> they are allowed to stay and view it

This behavior is useful for login pages that you don't want to be visitable by logged in users: Why should they go through a login flow again?

```vue
<script setup lang="ts">
definePageMeta({  
    auth: {    
        unauthenticatedOnly: true,
        navigateAuthenticatedTo: '/profile'
    }
})
</script>

<template>
    I can only be viewed as a guest!
</template>
```

## Custom Middleware

You may create your own application-side middleware in order to implement custom, more advanced authentication logic.

:::warning
Creating a custom middleware is an advanced, experimental option and may result in unexpected or undesired behavior if you are not familiar with advanced Nuxt 3 concepts.
:::

To implement your custom middleware:
- Create an application-side middleware that applies either globally or is named (see the Nuxt docs for more)
- Add logic based on [`useAuth`](/guide/application-side/session-access) to it

When adding the logic, you need to watch out when calling other `async` composable functions. This can lead to `context`-problems in Nuxt, see [the explanation for this here](https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529). In order to avoid these problems, you will need to either:

- use the undocumented `callWithNuxt` utility when awaiting other composables
- return an async function where possible instead of awaiting it to avoid `callWithNuxt`

::: code-group

```ts [Direct return]
// file: ~/middleware/authentication.global.ts
export default defineNuxtRouteMiddleware((to) => {
  const { status, signIn } = useAuth()

  // Return immediately if user is already authenticated
  if (status.value === 'authenticated') {
    return
  }

  /**
   * We cannot directly call and/or return `signIn` here as `signIn` uses async composables under the hood, leading to "nuxt instance undefined errors", see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
   *
   * So to avoid calling it, we return it immediately.
   */
  return signIn(undefined, { callbackUrl: to.path }) as ReturnType<typeof navigateTo>
})
```

```ts [Call with Nuxt]
// file: ~/middleware/authentication.global.ts
import { useNuxtApp } from '#imports'
import { callWithNuxt } from '#app/nuxt'

export default defineNuxtRouteMiddleware((to) => {
  // It's important to do this as early as possible
  const nuxtApp = useNuxtApp()

  const { status, signIn } = useAuth()

  // Return immediately if user is already authenticated
  if (status.value === 'authenticated') {
    return
  }

  /**
   * We cannot directly call and/or return `signIn` here as `signIn` uses async composables under the hood, leading to "nuxt instance undefined errors", see https://github.com/nuxt/framework/issues/5740#issuecomment-1229197529
   *
   * So to avoid calling it, we call it via `callWithNuxt`.
   */
  await callWithNuxt(nuxtApp, signIn, [undefined, { callbackUrl: to.path }])
})
```

:::
