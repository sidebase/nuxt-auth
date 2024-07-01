# Custom pages

NuxtAuth delivers a set of prebuilt authentication pages, that you can use out of the box. However, often you would like to customize and change the authention pages to match your branding. 

## Sign In page

## Error page

When an authentication related error occurs during the flow, the user will be redirected to your error page, along with an error code describing what error occured. You can handle the error yourself, by retrieving the error code from the url.

Example: `/auth/error?error=Configuration`

```vue
<script setup lang="ts">
const route = useRoute()
const erorCode = computed(() => route.params.error)
<script>

<template>
    <h1> Authentication error {{ errorCode }}. Please try again! </h1>
</template>
```

### Error codes

- `Configuration`: There is a problem with the server configuration.
- `AccessDenied`: Usually occurs, when you restricted access through the [`signIn` or `redirect` callback](/guide/authjs/nuxt-auth-handler#callbacks).
- `Verification`: Related to the Email provider. The token has expired or has already been used
- `Default`: Catch all, will apply, if none of the above matched
