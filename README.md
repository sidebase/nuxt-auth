# 🔐 nuxt-user

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars](https://badgen.net/github/stars/sidebase/nuxt-user)](https://GitHub.com/sidebase/nuxt-user/)
[![License][license-src]][license-href]
[![Follow us on Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/sidebase_io)
[![Join our Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/9MUHR8WT9B)


> Nuxt user authentication and sessions via [NextAuth.js](https://github.com/nextauthjs/next-auth). `nuxt-user` wraps [NextAuth.js](https://github.com/nextauthjs/next-auth) to offer the reliability & convenience of a 12k star library to the nuxt 3 ecosystem with a native developer experience (DX).

## Quick Start

1. Install the package:
    ```sh
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

There's more supported methods in the `useSession` composable, you can create authentication middlewares for your app and more - read the documentation below.

## Features

`nuxt-user` is still under active development. The goal of this library is to reach feature-parity with `NextAuth.js`. Currently, the library supports:

- ✔️ Client Library:
    - `useSession` composable to: `signIn`, `signOut`, `getCsrfToken`, `getProviders`, `getSession`
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
- ✔️ Client-side middleware protection
- ✔️ TODO: Backend endpoint protection

## Demo Page

Visit the [`nuxt-user` demo page here](https://nuxt-user-example.sidebase.io/):
[![nuxt-user demo page](./.github/nuxt-user-demo.png)](https://nuxt-user-example.sidebase.io/)

You can find the [full source code here](https://github.com/sidebase/nuxt-user-example).

### Module Playground

This module also has it's own playground, you can also use that to get familiar with it and play around a bit:
```sh
> git clone https://github.com/sidebase/nuxt-user

> cd nuxt-user

> npm i

> npm run dev:prepare

> npm run dev

# TODO: Add instructions to add example provider
# -> open http://localhost:3000
```

Note: The playground has considerably less polishing than the example page.

## Documentation

First of all: If you want to have an interactive look, either check-out the [demo page](#demo-page) or the [module playground](#module-playground) in the sections above.

The `nuxt-user` module takes care of authentication and sessions:
    - authentication: The process of ensuring that somebody is who they claims to be. This is like a passport check at the border: You present some sort of proof that 100% tells the checking entity that you are who you claim to be (typically, this is your passport). The border agents checks the passport and let's you through.
    - sessions: Persist the information that you have been authenticated for some duration across different requests. Additional data can be attached to a session, e.g., via the `mail` or `username` that may be part of data attached to the session. Note: If you need only sessions but no authentication, you can check-out [nuxt-session](https://github.com/sidebase/nuxt-session).

In addition, you can use `nuxt-user` to build authorization on top of the supported authentication + session mechanisms: As soon as you know "whos who", you can use this information to let somebody with the right email adress (for example) into a specific area. Right now, this is not supported out of the box.

Below we describe:
1. [Client-side usage](#client-side-usage)
    - [Session access and manipulation](#session-access-and-manipulation)
    - [Middlewares](#middlewares)
        - [Global middlewares](#global-middlewares)
        - [Named middlewares](#named-middlewares)
        - [Inline middlewares](#inline-middlewares)
2. [Server-side usage](#server-side-usage)
3. [REST API](#rest-api)
4. [Configuration](#configuration)
5. [Prior Work and Module Concept](#prior-work-and-module-concept)
    - [Project Roadmap](#project-roadmap)
6. [Development](#development)

### Client-side usage

This module allows you user-data access, signing in, signing out and more on the client-side [via `useSession`](#session-access-and-manipulation). It also allows you to defined [middlewares that protects your page](#middlewares).

#### Session access and manipulation


The `useSession` composable is your main gateway to accessing and manipulating session-state and data. Here's the main methdos you can use:
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

Session `data` has the following interface:
```ts
interface DefaultSession {
    user?: {
        name?: string | null;
        email?: string | null;
        image?: string | null;
    };
    expires: ISODateString;
}
```

Note that this is only set when the use is logged-in and when the provider used to login the user provides the fields.

#### Middlewares

You can use this library to define client-side middlewares. This library supports all of [nuxt's supported approaches](https://v3.nuxtjs.org/guide/directory-structure/middleware#middleware-directory) to define client-side middlewares, read on to learn how.

##### Global middlewares

Create a global authentication middleware that ensures that your user is authenticated no matter which page they visit. For this create a file in the `middlewares` directory that has a `.global.ts` post-fix. It should look like this:
```ts
// file: ~/middlewares/auth.global.ts
import { defineNuxtRouteMiddleware } from '#app'
import useSession from '~/composables/useSession'

export default defineNuxtRouteMiddleware(async () => {
    await useSession()
})
```

That's it! This middleware will fetch a session and if no active session exists for the current user redirect to the login screen. If you want to write custom redirect logic, you could alter the above code to only apply to specific routes. Here is a global middleware that protects only the routes that start with `/secret/`:
```ts
// file: ~/middlewares/auth.global.ts
import { defineNuxtRouteMiddleware } from '#app'
import useSession from '~/composables/useSession'

export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/secret/')) {
    return
  }
  await useSession()
})
```

Here's a middleware that redirects to a custom login page:
```ts
// file: ~/middlewares/auth.global.ts
import { defineNuxtRouteMiddleware, navigateTo } from '#app'
import useSession from '~/composables/useSession'

export default defineNuxtRouteMiddleware(async (to) => {
  // 1. Always allow access to the login page
  if (to.path === '/login') {
    return
  }

  // 2. Otherwise: Check status and redirect to login page
  const { status } = await useSession({ required: false })
  if (status.value !== 'authenticated') {
    navigateTo('/login')
  }
})
```

##### Named middlewares

Named middlewares behave similar to [global middlewares](#global-middleware) but are not automatically applied to any pages.

To use them, first create a middleware:
```ts
// file: ~/middlewares/auth.ts
import { defineNuxtRouteMiddleware } from '#app'
import useSession from '~/composables/useSession'

export default defineNuxtRouteMiddleware(async () => {
    await useSession()
})
```

Note that there's no `.global.ts` postfix in the filename above! Then inside your pages use this middleware like this:
```vue
<!-- file: ~/pages/protected.vue -->
<template>
  <div>I'm a secret!</div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: ['auth']
})
</script>
```

Note: `definePageMeta` can only be used inside the `pages/` directory!

Nuxt now calls the `auth.ts` middleware on every visit to this page.

##### Inline middlewares

To define a named middleware, you need to use `definePageMeta` as described [in the nuxt docs](https://v3.nuxtjs.org/api/utils/define-page-meta/). Then you can just call `useSession` as in the other middlewares. Here's an example that would protect just the page itself:
```vue
<!-- file: ~/pages/protected.vue -->
<template>
  <div>I'm a secret!</div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: async () => {
    await useSession()
  }
})
</script>
```

Note: `definePageMeta` can only be used inside the `pages/` directory!

#### Server-side usage

<!-- TODO -->

#### REST API

All endpoints that NextAuth.js supports are also supported by `nuxt-user`:
- `GET /signin`,
- `POST /signin/:provider`,
- `GET/POST /callback/:provider`,
- `GET /signout`,
- `POST /signout`,
- `GET /session`,
- `GET /csrf`,
- `GET /providers`

You can directly interact with them if you wish to, it's probably a better idea to use `useSession` where possible though. [See the full rest API documentation of NextAuth.js here](https://next-auth.js.org/getting-started/rest-api).

#### Configuration

<!-- TODO -->

#### Prior Work and Module Concept

The idea of this library is to re-use all the open-source implementation that already exist in the JS ecosystem instead of rolling our own. The idea was born when researching through the ecosystem of framework-specific authentication libraries to figure out what the best implementation approach for a state-of-the-art nuxt 3 authentication library would be.

During research it became clear that implementing everything from scratch will be:
- a lot of work that has already been open-sourced by others,
- error prone as authentication has a lot of intricacies that need to be resolved in order to get it right,
- hard to maintain as authentication providers come and go,
- hard to build initial trust for as authentication is important and cannot go wrong,

In order to avoid these problems without taking forever (leaving nuxt without an authentication library in the meantime), we decided to investigate if we can wrap [`NextAuth.js`](https://github.com/nextauthjs/next-auth), the most popular authentication library in the Next.js ecosystem by far and a trusted, well maintained one at that!

In our investigation we found prior attempts to make NextAuth.js framework agnostic. These have more or less come to fruition, so far mostly resulting in some PoCs and example apps. Looking at these was quite helpful to get started. In particular, big pushes in the right direction came from:
- [NextAuth.js app examples](https://github.com/nextauthjs/next-auth/tree/main/apps)
- [Various comments, proposals, ... of this thread](https://github.com/nextauthjs/next-auth/discussions/3942), special thanks to @brillout for starting the discussion, @balazsorban44 for NextAuth.js and encouraging the discussion, @wobsoriano for adding PoCs for multiple languages

The main part of the work was to piece everything together, resolve some outstanding issues with existing PoCs, add new things where nothing existed yet, e.g., for the client `useSession` composable by going through the NextAuth.js client code and translating it to a nuxt 3 approach.

##### Project Roadmap

Roughly, the roadmap of `nuxt-user` is:
1. Reach client-side feature parity: There's still a lot of options, configuration and behvaior from the client-side NextAuth.js module that we do not support yet. We first want to reach feature parity on this front,
2. Reach configuration & server-side parity: Extending the user data model, ensuring full typescript support in doing that, allowing correct configuration of all supported backends and session storage mediums
3. Fill in missing gaps, add some of our own: There's many ideas we have to support extended user management, maybe discuss whether we want to better support the `local` / `credentials` flow than NextAuth.js does out of the box (they don't do it for good reasons, so, there really is an honest discussion to be had), adding more UI focused components that automatically and easily wrap your app in a nice auth page, ...

We also want to listen to all suggestions, feature requests, bug reports, ... from you. So if you have any ideas, please open an issue or reach out to us on Twitter or via E-Mail.

#### Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [the module playground](./playground) in development mode.
- Run `npm run lint` to run eslint
- Run `npm run type` to run typescheck via tsc
- Run `npm publish --access public` to publish (bump version before)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@sidebase/nuxt-user/latest.svg
[npm-version-href]: https://npmjs.com/package/@sidebase/nuxt-user

[npm-downloads-src]: https://img.shields.io/npm/dt/@sidebase/nuxt-user.svg
[npm-downloads-href]: https://npmjs.com/package/@sidebase/nuxt-user

[license-src]: https://img.shields.io/npm/l/@sidebase/nuxt-user.svg
[license-href]: https://npmjs.com/package/@sidebase/nuxt-user
