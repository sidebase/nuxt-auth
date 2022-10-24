# nuxt-user

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars](https://badgen.net/github/stars/sidebase/nuxt-user)](https://GitHub.com/sidebase/nuxt-user/)
[![License][license-src]][license-href]
[![Follow us on Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/sidebase_io)
[![Join our Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/9MUHR8WT9B)

> 🔑 Nuxt user authentication, authorization and sessions via [NextAuth.js](https://github.com/nextauthjs/next-auth). `nuxt-user` wraps [NextAuth.js](https://github.com/nextauthjs/next-auth) to offer the reliability & convenience of a 12k star library to the nuxt 3 ecosystem with a native developer experience (DX).

## Quick Start

1. Install the package:
    ```ts
    npm i -D @sidebase/nuxt-user
    ```
2. Add the package to your `nuxt.config.ts`:
    ```ts
    export default defineNuxtConfig({
      modules: ['@sidebase/nuxt-user'],
    })
    ```
3. Done! You can now use all user-related functionality, for example:
    - client-side (e.g., from `.vue` files):
        ```ts
        const {
          status,
          data,
          signIn,
          signOut,
        } = await useSession({
          // Whether a session is required. If it is, a redirect to the signin page will happen if no active session exists
          required: true
        })

        // Session status: `unauthenticated`, `loading`, `authenticated`
        status.value

        // Session data, e.g., expiration, user.email, ...
        data.value

        // Start the unbranded sign-in flow
        signIn()

        // Logout the user
        await signOut()
        ```
    <!-- TODO: Will we even support server access in the V1? -->
    - server-side (e.g., from `server/api` files):
        ```ts

        ```

## Features

- ✔️ Client Library:
    - `useSession` composable to: signIn, signOut, getCsrfToken, getProviders, getSession
    - full typescript support for all methods and property
- ✔️ REST API:
    - `GET /signin`,
    - `POST /signin/:provider`,
    - `GET/POST /callback/:provider`,
    - `GET /signout`,
    - `POST /signout`,
    - `GET /session`,
    - `GET /csrf`,
    - `GET /providers`
- ✔️ Persistent sessions across requests
- ✔️ TBD: Middleware client side protection
- ✔️ TBD: Backend endpoint protection

`nuxt-user` is still under active development. The goal of this library is to fully wrap `NextAuth.js` soon.

## Playground

An example page making use of `nuxt-user`:

<!-- TODO: Add playground picture -->

See the playground to interactively use this:
```sh
> git clone https://github.com/sidebase/nuxt-user

> cd nuxt-user

> npm i

> npm run dev:prepare

> npm run dev

# TODO: Add instructions to add example provider

# -> open http://localhost:3000
```

## Documentation

First of all: Try out the [playground](#playground) and look at it's code if you want to test-drive this package and learn how to use it in your app.

<!-- TODO -->

Below we describe:
<!-- TODO -->
1. TODO


### Wrapper status

Supported from https://next-auth.js.org/getting-started/client:
```ts
const {
  status,
  data,
  getCsrfToken,
  getProviders,
  getSession,
  signIn,
  signOut,
} = await useSession({
  // Whether a session is required. If it is, a redirect to the signin page will happen if no active session exists
  required: true
})

// Session status, either `unauthenticated`, `loading`, `authenticated`, see https://next-auth.js.org/getting-started/client#signout
status.value

// Session data, either `undefined` (= authentication not attempted), `null` (= user unauthenticated), `loading` (= session loading in progress), see https://next-auth.js.org/getting-started/client#signout
data.value

// Get / Reload the current session from the server, pass `{ required: true }` to force a login if no session exists, see https://next-auth.js.org/getting-started/client#getsession
await getSession()

// Get the current CSRF token, usually you do not need this function, see https://next-auth.js.org/getting-started/client#signout
await getCsrfToken()

// Get the supported providers, e.g., to build your own login page, see https://next-auth.js.org/getting-started/client#getproviders
await getProviders()

// Trigger a sign in, see https://next-auth.js.org/getting-started/client#signin
signIn()

// Trigger a sign out, see https://next-auth.js.org/getting-started/client#signout
await signOut()
```

## Prior Work

This implementation is (as probably all implementations are) based on prior work:
- nextauth apps
- nextauth faqs
- nextauth making framework agnostic

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [the module playground](./playground) in development mode.
- Run `npm run lint` to run eslint
- Run `npm run type` to run typescheck via tsc


<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@sidebase/nuxt-user/latest.svg
[npm-version-href]: https://npmjs.com/package/@sidebase/nuxt-user

[npm-downloads-src]: https://img.shields.io/npm/dt/@sidebase/nuxt-user.svg
[npm-downloads-href]: https://npmjs.com/package/@sidebase/nuxt-user

[license-src]: https://img.shields.io/npm/l/@sidebase/nuxt-user.svg
[license-href]: https://npmjs.com/package/@sidebase/nuxt-user
