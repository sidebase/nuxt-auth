# Custom pages

NuxtAuth delivers a set of prebuilt authentication pages that you can use out of the box. However, in most cases you may like to customize the authentication pages to match your branding.

:::info
Remember to disable any authentication related middleware on pages that unauthenticated users should be able to access (e.g. `signIn`)
:::

## Sign In page

When crafting your custom sign-in page you can use `signIn` to directly start a provider-flow. For example, when a user clicks a button on your custom sign-in page. Here is a very simple sign-in page that either directly starts a GitHub-OAuth sign-in flow or directly signs the user in via the credentials flow:

```vue
<script setup lang="ts">
// Remember to disable the middleware protection from your page!
definePageMeta({
  auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: '/' }
})

const { signIn } = useAuth()

/*
 * NOTE: Here we hard-coded username and password
 * On your own page this should probably be connected to two inputs
 */
const demoCredentials = { username: 'test', password: 'hunter2' }
</script>

<template>
  <div>
    <p>Sign-In Options:</p>
    <button @click="signIn('github')">
      Github
    </button>
    <button @click="signIn('credentials', demoCredentials)">
      Username and Password
    </button>
  </div>
</template>
```

::: warning
In the above example username and password are hard-coded. In your own custom page, these two fields should probably come from inputs on your page.
:::

If you want to create a custom sign-in page that dynamically offers sign-in options based on your configured providers, you can call `getProviders()` first and then iterate over the supported providers to generate your sign-in page.

```vue
<script setup lang="ts">
// Remember to disable the middleware protection from your page!
definePageMeta({
  auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: '/' }
})

const { signIn, getProviders } = useAuth()
const providers = await getProviders()
</script>

<template>
  <button v-for="provider in providers" :key="provider.id" @click="signIn(provider.id)">
    Sign in with {{ provider.name }}
  </button>
</template>
```

## Error page

When an authentication related error occurs during the flow, the user will be redirected to your error page, along with an error code describing what error occured. You can handle the error yourself, by retrieving the error code from the url.

Example: `/auth/error?error=Configuration`

```vue
<script setup lang="ts">
// Remember to disable the middleware protection from your page!
definePageMeta({
  auth: { unauthenticatedOnly: true, navigateAuthenticatedTo: '/' }
})

const route = useRoute()
const erorCode = computed(() => route.params.error)
</script>

<template>
  <h1> Authentication error {{ errorCode }}. Please try again! </h1>
</template>
```

### Error codes

- `Configuration`: There is a problem with the server configuration.
- `AccessDenied`: Usually occurs, when you restricted access through the [`signIn` or `redirect` callback](/guide/authjs/nuxt-auth-handler#callbacks).
- `Verification`: Related to the Email provider. The token has expired or has already been used
- `Default`: Catch all, will apply, if none of the above matched

## Themes

Looking for a quick start with some pre-made themes? Have a look at [Morpheme UI](https://ui.morpheme.design/templates/nuxt-auth.html), which provides an out of the box integration with NuxtAuth!

![morpheme-preview](/authjs/morpheme-auth-screenshot.png)
