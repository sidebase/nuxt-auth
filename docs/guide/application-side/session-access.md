# Session Access and Management

After setting up your provider of choice, you can begin integrating NuxtAuth into your frontend. For this NuxtAuth provides two application-side composables that can be used to interact with the authentication session.

## `useAuth` composable

The `useAuth` composable is your main gateway to accessing and manipulating session-state and data. Here are the main methods you can use:

::: code-group

```ts [authjs]
const {
  status,
  data,
  lastRefreshedAt,
  getCsrfToken,
  getProviders,
  getSession,
  signIn,
  signOut
} = useAuth()
```

```ts [local]
const {
  status,
  data,
  lastRefreshedAt,
  token,
  refreshToken,
  getSession,
  signUp,
  signIn,
  signOut,
  refresh
} = useAuth()
```

:::

### `status`

Computed value that returns the current session status. Options: `unauthenticated`, `loading` or `authenticated`.

```vue
<script setup lang="ts">
const { status } = useAuth()
</script>

<template>
  You are currently {{ status }}.
</template>
```

### `data`

The current data inside the session. Options: `undefined` when no authentication attempt was made, `null` when the user is unauthenticated, `SessionData` when the user is authenticated.

To customize your `SessionData` see the following docs for [authjs](/guide/authjs/session-data) and [local / refresh](/guide/local/session-data).

```vue
<script setup lang="ts">
const { data } = useAuth()
</script>

<template>
  <div v-if="data">
    Hello {{ data.user.name }}!
  </div>
  <div v-else>
    You are not logged in.
  </div>
</template>
```

### `token` <Badge type="warning">local only</Badge>

The fetched token that can be used to authenticate further requests. This could be e.g. a JWT-Bearer token.

```ts
function useAPI() {
  const { token } = useAuth()

  return $fetch.create({
    baseURL: '/api',
    headers: {
      Authorization: `Bearer ${token.value}`
    }
  })
}
```

:::warning Local Only
`token` is only avalible for the local provider!
:::

### `lastRefreshedAt`

Time at which the session was last refreshed, either `undefined` if no refresh was attempted or a `Date` of the time the refresh happened.

### `getCsrfToken` <Badge type="warning">authjs only</Badge>

Returns the current Cross Site Request Forgery Token (CSRF Token) required to make POST requests (e.g. for signing in and signing out).

You likely only need to use this if you are not using the built-in `signIn()` and `signOut()` methods. Read more: https://next-auth.js.org/getting-started/client#getcsrftoken

:::warning AuthJS Only
`getCsrfToken` is only avalible for the authjs provider!
:::

### `getProviders` <Badge type="warning">authjs only</Badge>

Get a list of all the configured OAuth providers. Useful for creating a [custom login page](/guide/authjs/custom-pages#sign-in-page). Returns an array of `Provider`.

```ts
export interface Provider {
  id: string
  name: string
  type: ProviderType
  signinUrl: string
  callbackUrl: string
}
```

:::warning AuthJS Only
`getProviders` is only avalible for the authjs provider!
:::

### `getSession`

Get or reload the current session from the server. Optionally pass `required` to force a signIn if the session doesn't exist.

```vue
<script setup lang="ts">
const { getSession } = useAuth()
</script>

<template>
  <button @click="() => getSession()">
    Refresh
  </button>
  <button @click="() => getSession({ required: true })">
    Refresh or trigger signin
  </button>
</template>
```

### `signUp` <Badge type="warning">local only</Badge>

```ts
// `credentials` are the credentials your sign-up endpoint expects,
const credentials = { username: 'jsmith', password: 'hunter2' }

// Trigger a sign-up
await signUp(credentials)

// Trigger a sign-up with auto sign-in and redirect to the profile page within the application
await signUp(credentials, { callbackUrl: '/profile', redirect: true })

// Trigger a sign-up with auto sign-in and redirect to an external website (https://external.example.com)
await signUp(credentials, { callbackUrl: 'https://external.example.com', redirect: true, external: true })

// Trigger a sign-up without auto sign-in and redirect to the home page within the application
await signUp(credentials, { callbackUrl: '/', redirect: true }, { preventLoginFlow: true })

// Trigger a sign-up without auto sign-in and doesn't redirect anywhere
await signUp(credentials, undefined, { preventLoginFlow: true })
```

:::info
You can also pass the `callbackUrl` option to redirect a user to a certain page, after they completed the action. This can be useful when a user attempts to open a page (`/protected`) but has to go through external authentication (e.g., via their google account) first.
:::

:::warning Local Only
`signUp` is only avalible for the local provider!
:::

### `signIn`

`signIn` uses a different syntax depending on your provider.

::: code-group

```ts [authjs]
// Trigger a signIn on the signIn page
await signIn()

// Trigger a signIn with a specific oAuth provider
await signIn('github')

// Trigger a signIn with the credentials provider
await signIn('credentials', { username: 'jsmith', password: 'hunter2' })

// Trigger a signIn with a redirect afterwards
await signIn(undefined, { callbackUrl: '/protected' })

// Trigger a signIn with a redirect to an external page afterwards
await signIn(undefined, { callbackUrl: 'https://nuxt.org', external: true })
```

```ts [local / refresh]
// `credentials` are the credentials your sign-in endpoint expects,
const credentials = { username: 'jsmith', password: 'hunter2' }

// Trigger a signIn
await signIn(credentials)

// Trigger a signIn with a redirect afterwards
await signIn(credentials, { callbackUrl: '/protected' })

// Trigger a signIn with a redirect to an external page afterwards
await signIn(credentials, { callbackUrl: 'https://nuxt.org', external: true })

// Trigger a signIn without calling getSession directly. You have to manually call it to get session data.
await signIn(credentials, { callGetSession: false })
```

:::

:::info
You can also pass the `callbackUrl` option to redirect a user to a certain page, after they completed the action. This can be useful when a user attempts to open a page (`/protected`) but has to go through external authentication (e.g., via their google account) first.
:::

### `signOut`

Sign a user out of the application. Optionally pass a `callbackUrl` to redirect a user to afterwards.

```vue
<script setup lang="ts">
const { signOut } = useAuth()
</script>

<template>
  <button @click="() => signOut">
    Signout
  </button>
  <button @click="() => signOut({ callbackUrl: '/signout' })">
    Signout with redirect
  </button>
  <button @click="() => signOut({ callbackUrl: 'https://nuxt.org', external: true })">
    Signout with external redirect
  </button>
</template>
```

:::info
You can also pass the `callbackUrl` option to redirect a user to a certain page, after they completed the action. This can be useful when a user attempts to open a page (`/protected`) but has to go through external authentication (e.g., via their google account) first.
:::

### `refreshToken` <Badge type="warning">local only</Badge>

The fetched refreshToken that can be used to obtain a new access token . E.g. a refreshToken looks like this: `eyDFSJKLDAJ0-3249PPRFK3P5234SDFL;AFKJlkjdsjd.dsjlajhasdji89034`

:::warning Local Only
`refreshToken` is only avalible for the local provider!
:::

### `refresh`

Trigger a refresh, this will do a provider-specific session refresh.

## `useAuthState` composable

The `useAuthState` composable is the underlying storage layer to access the session-state and data. Here're the main methods and properties you can use:

::: code-group

```ts [authjs]
const {
  status,
  loading,
  data,
  lastRefreshedAt
} = useAuthState()

// Session status, either `unauthenticated`, `loading`, `authenticated`
status.value

// Whether any http request is still pending
loading.value

// Session data, either `undefined` (= authentication not attempted), `null` (= user unauthenticated), `loading` (= session loading in progress), see https://next-auth.js.org/getting-started/client#signout
data.value

// Time at which the session was last refreshed, either `undefined` if no refresh was attempted or a `Date` of the time the refresh happened
lastRefreshedAt.value
```

```ts [local]
const {
  status,
  loading,
  data,
  lastRefreshedAt,
  token,
  rawToken,
  setToken,
  clearToken,
  rawRefreshToken,
  refreshToken
} = useAuthState()

// Session status, either `unauthenticated`, `loading`, `authenticated`
status.value

// Whether any http request is still pending
loading.value

// Session data, either `undefined` (= authentication not attempted), `null` (= user unauthenticated), or session / user data your `getSession`-endpoint returns
data.value

// Time at which the session was last refreshed, either `undefined` if no refresh was attempted or a `Date` of the time the refresh happened
lastRefreshedAt.value

// The fetched token that can be used to authenticate future requests. E.g., a JWT-Bearer token like so: `Bearer eyDFSJKLDAJ0-3249PPRFK3P5234SDFL;AFKJlkjdsjd.dsjlajhasdji89034`
token.value

// Cookie that containes the raw fetched token string. This token won't contain any modification or prefixes like `Bearer` or any other.
rawToken.value

// Helper method to quickly set a new token (alias for rawToken.value = 'xxx')
setToken('new token')

// Helper method to quickly delete the token cookie (alias for rawToken.value = null)
clearToken()
```

:::

:::warning Local provider:
Note that you will have to manually call getSession from useAuth composable in order to refresh the new user state when using setToken, clearToken or manually updating rawToken.value:
:::

```ts
const { getSession } = useAuth()

const { setToken } = useAuthState()
// ...setToken('...')
await getSession()
```
