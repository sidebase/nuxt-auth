# JWT Access

Getting the (decoded) JWT token of the current user can be helpful, e.g., to use it to access an external api that requires this token for authentication or authorization.

You can get the JWT token that was passed along with the request using `getToken`:

```ts
// file: ~/server/api/token.get.ts
import { getToken } from '#auth'

export default eventHandler(async (event) => {
    const token = await getToken({ event })

    return token || 'no token present'
})
```

The function behaves identical to the [`getToken` function from AuthJS](https://authjs.dev/reference/core/jwt#gettoken) with one change: you have to pass in the h3-`event` instead of `req`. This is due to how cookies can be accessed on h3: not via `req.cookies` but rather via `useCookies(event)`.

You do not need to pass in any further parameters like `secret`, `secureCookie`, ... They are automatically inferred to the values you configured if not set and reading the token will work out of the box. You _may_ pass these options, e.g., to get the raw, encoded JWT token you can pass `raw: true`.

## Application-side JWT token access

To access the JWT token application-side, e.g., in a `.vue` page, you can either:

- Create an API endpoint to return the decoded JWT Token
- Modify the `jwt` callback inside the NuxtAuthHandler to inject token data into the application-side session. Read more [here](/guide/authjs/session-data)

### Accessing the JWT token through an API endpoint

To access the JWT token through an API endpoint, you will first need to create a new server side route that can handle the requests for the JWT token.

```ts
// file: ~/server/api/token.get.ts
import { getToken } from '#auth'

export default eventHandler(event => getToken({ event }))
```

Then from your application-side code you can fetch it like this:
```vue
<template>
    <div>{{ token || 'no token present, are you logged in?' }}</div>
</template>

<script setup lang="ts">
const headers = useRequestHeaders(['cookie']) as HeadersInit
const { data: token } = await useFetch('/api/token', { headers })
</script>
```

:::warning Note:
For this to work, you will need to pass the cookie-header manually using [`useRequestHeaders`](https://nuxt.com/docs/api/composables/use-request-headers/) so that the cookies are also correctly passed when this page is rendered server-side during the [universal-rendering process](https://nuxt.com/docs/guide/concepts/rendering#universal-rendering).
:::
