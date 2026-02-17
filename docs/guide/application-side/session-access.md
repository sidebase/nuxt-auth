---
title: Session Access
group: Application Side
---

# Session Access and Management

After setting up your provider, you can begin integrating NuxtAuth
into your frontend. For this NuxtAuth provides two application-side
composables that can be used to interact with the authentication session.

## `useAuth` composable

The `useAuth` composable is your main gateway to accessing and manipulating
session-state and data. Here are the main methods you can use:

```ts
const {
  status,
  data,
  lastRefreshedAt,
  getCsrfToken,
  getProviders,
  getSession,
  signIn,
  signOut,
} = useAuth()
```

### `status`

Computed value that returns the current session status. Options:
`unauthenticated`, `loading` or `authenticated`.

```vue
<script setup lang="ts">
const { status } = useAuth()
</script>

<template>You are currently {{ status }}.</template>
```

### `data`

The current data inside the session. Options: `undefined` when no
authentication attempt was made, `null` when the user is unauthenticated,
`SessionData` when the user is authenticated.

To customize your `SessionData` see the session data documentation for your
provider.

```vue
<script setup lang="ts">
const { data } = useAuth()
</script>

<template>
  <div v-if="data">Hello {{ data.user.name }}!</div>
  <div v-else>You are not logged in.</div>
</template>
```

### `lastRefreshedAt`

Time at which the session was last refreshed, either `undefined` if no refresh
was attempted or a `Date` of the time the refresh happened.

### `getCsrfToken`

Returns the current Cross Site Request Forgery Token (CSRF Token) required to
make POST requests (e.g. for signing in and signing out).

You likely only need to use this if you are not using the built-in `signIn()`
and `signOut()` methods. Read more:
https://next-auth.js.org/getting-started/client#getcsrftoken

### `getProviders`

Get a list of all the configured OAuth providers. Useful for creating a custom
login page. Returns an array of `Provider`.

```ts
export interface Provider {
  id: string
  name: string
  type: ProviderType
  signinUrl: string
  callbackUrl: string
}
```

### `getSession`

Get or reload the current session from the server. Optionally pass `required`
to force a signIn if the session doesn't exist.

```vue
<script setup lang="ts">
const { getSession } = useAuth()
</script>

<template>
  <button @click="() => getSession()">Refresh</button>
  <button @click="() => getSession({ required: true })">
    Refresh or trigger signin
  </button>
</template>
```

### `signIn`

```ts
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

> **Note:** You can also pass the `callbackUrl` option to redirect a user to
> a certain page, after they completed the action. This can be useful when a
> user attempts to open a page (`/protected`) but has to go through external
> authentication (e.g., via their google account) first.

### `signOut`

Sign a user out of the application. Optionally pass a `callbackUrl` to
redirect a user to afterwards.

```vue
<script setup lang="ts">
const { signOut } = useAuth()
</script>

<template>
  <button @click="() => signOut">Signout</button>
  <button @click="() => signOut({ callbackUrl: '/signout' })">
    Signout with redirect
  </button>
  <button
    @click="
      () => signOut({ callbackUrl: 'https://nuxt.org', external: true })
    "
  >
    Signout with external redirect
  </button>
</template>
```

> **Note:** You can also pass the `callbackUrl` option to redirect a user to
> a certain page, after they completed the action. This can be useful when a
> user attempts to open a page (`/protected`) but has to go through external
> authentication (e.g., via their google account) first.

### `refresh`

Trigger a refresh, this will do a provider-specific session refresh.

## `useAuthState` composable

The `useAuthState` composable is the underlying storage layer to access the
session-state and data. Here are the main methods and properties you can use:

```ts
const { status, loading, data, lastRefreshedAt } = useAuthState()

// Session status, either `unauthenticated`, `loading`, `authenticated`
status.value

// Whether any http request is still pending
loading.value

// Session data, either `undefined` (= authentication not attempted),
// `null` (= user unauthenticated), `loading` (= session loading in progress)
data.value

// Time at which the session was last refreshed
lastRefreshedAt.value
```
