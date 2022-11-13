# 🔐 nuxt-auth

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars](https://badgen.net/github/stars/sidebase/nuxt-auth)](https://GitHub.com/sidebase/nuxt-auth/)
[![License][license-src]][license-href]
[![Follow us on Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/sidebase_io)
[![Join our Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/9MUHR8WT9B)


> Nuxt user authentication and sessions via [NextAuth.js](https://github.com/nextauthjs/next-auth). `nuxt-auth` wraps [NextAuth.js](https://github.com/nextauthjs/next-auth) to offer the reliability & convenience of a 12k star library to the nuxt 3 ecosystem with a native developer experience (DX).

## Quick Start

1. Install the package:
    ```sh
    npm i -D @sidebase/nuxt-auth
    ```
2. Add the package to your `nuxt.config.ts`:
    ```ts
    export default defineNuxtConfig({
      modules: ['@sidebase/nuxt-auth'],
    })
    ```
3. Create the authentication handler (`NuxtAuthHandler`) and add at least one [authentication provider](https://next-auth.js.org/providers/):
    ```ts
    // file: ~/server/api/auth/[...].ts
    import { NuxtAuthHandler } from '#auth'
    import GithubProvider from 'next-auth/providers/github'

    export default NuxtAuthHandler({
      providers: [
        // @ts-ignore Import is exported on .default during SSR, so we need to call it this way. May be fixed via Vite at some point
        GithubProvider.default({ clientId: 'enter-your-client-id-here', clientSecret: 'enter-your-client-secret-here' })
      ]
    })
    ```
    - `[..].ts` is a catch-all route, see the [nuxt server docs](https://v3.nuxtjs.org/guide/directory-structure/server#catch-all-route)
4. Done! You can now use all user-related functionality, for example:
    - client-side (e.g., from `.vue` files):
        ```ts
        const { status, data, signIn, signOut } = await useSession({
          // Whether a session is required. If it is, a redirect to the signin page will happen if no active session exists
          required: true
        })

        status.value // Session status: `unauthenticated`, `loading`, `authenticated`
        data.value // Session data, e.g., expiration, user.email, ...

        await signIn() // Sign in the user
        await signOut() // Sign out the user
        ```

There's more supported methods in the `useSession` composable, you can create APP and API authentication middleware - read the documentation below.

## Features

- ✔️ Authentication providers:
    - ✔️ OAuth (e.g., Github, Google, Twitter, Azure, ...)
    - ✔️ Custom OAuth (write it yourself)
    - ✔️ Credentials (password + username)
    - 🚧 Email Magic URLs
- ✔️ Client Library:
    - `useSession` composable to: `signIn`, `signOut`, `getCsrfToken`, `getProviders`, `getSession`
    - full typescript support for all methods and property
- ✔️ Persistent sessions across requests
- ✔️ Application-side middleware protection
- ✔️ Server-side middleware and endpoint protection
- ✔️ REST API:
    - `GET /signin`,
    - `POST /signin/:provider`,
    - `GET/POST /callback/:provider`,
    - `GET /signout`,
    - `POST /signout`,
    - `GET /session`,
    - `GET /csrf`,
    - `GET /providers`

`nuxt-auth` is actively maintained. The goal of this library is to reach feature-parity with `NextAuth.js`, see the current [status](#project-roadmap) below.

## Demo Page

Visit the [`nuxt-auth` demo page here](https://nuxt-auth-example.sidebase.io/):
![nuxt-auth demo page](.github/nuxt-user-demo.jpg)

You can find the [demo source-code here](https://github.com/sidebase/nuxt-auth-example).

## Documentation

The `nuxt-auth` module takes care of authentication and sessions:
- authentication: The process of ensuring that somebody is who they claims to be, e.g., via a username and password or by trusting an external authority (e.g., oauth via google, amazon, ...)
- sessions: Persist the information that you have been authenticated for some duration across different requests. Additional data can be attached to a session, e.g., a `username`. (Note: If you need only sessions but no authentication, you can check-out [nuxt-session](https://github.com/sidebase/nuxt-session))

In addition, you can use `nuxt-auth` to build authorization on top of the supported authentication + session mechanisms: As soon as you know "whos who", you can use this information to let somebody with the right email adress (for example) into a specific area. Right now, this is not in-scope of `nuxt-auth` itself.

If you want to have a more interactive introduction, check-out the [demo page](#demo-page) or the [module playground](#module-playground).

Below we describe:
1. [Configuration](#configuration)
    - [`nuxt.config.ts`](#nuxtconfigts)
        - [origin](#origin)
        - [basePath](#basepath)
    - [NuxtAuthHandler](#nuxtauthhandler)
        - [Example with two providers](#example-with-two-providers)
2. [Application-side usage](#application-side-usage)
    - [Session access and manipulation](#session-access-and-manipulation)
        - [Redirects](#redirects)
    - [Middleware](#middleware)
        - [Global middleware](#global-middleware)
        - [Named middleware](#named-middleware)
        - [Inline middleware](#inline-middleware)
3. [Server-side usage](#server-side-usage)
    - [Server-side endpoint protection](#server-side-endpoint-protection)
    - [Server-side middleware](#server-side-middleware)
4. [REST API](#rest-api)
5. [Prior Work and Module Concept](#prior-work-and-module-concept)
    - [Project Roadmap](#project-roadmap)
6. [Module Playground](#module-playground)
7. [Development](#development)

### Configuration

There's two places to configure `nuxt-auth`:
- [`auth`-key in `nuxt.config.ts`](#nuxtconfigts): Configure the module itself, e.g., where the auth-endpoints are, what origin the app is deployed to, ...
- [NuxtAuthHandler](#nuxtauthhandler): Configure the authentication behavior, e.g., what authentication providers to use

For development, you can stay with the [Quick Start](#quick-start)-configuration.

For a production deployment, you will have to at least set the:
- `origin` inside the `nuxt.config.ts` config (equivalent to `NEXTAUTH_URL` environment variable),
- `secret` inside the `NuxtAuthHandler` config (equivalent to `NEXTAUTH_SECRET` environment variable)

#### `nuxt.config.ts`

Use the `auth`-key inside your `nuxt.config.ts` to configure the module itself. Right now this is limited to the following options:
```ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    // The module is enabled. Change this to disable the module
    isEnabled: true,

    // The origin is set to the development origin. Change this when deploying to production
    origin: 'http://localhost:300',

    // The base path to the authentication endpoints. Change this if you want to add your auth-endpoints at a non-default location
    basePath: '/api/auth'
  }
})
```

The `origin` and the `basePath` together are equivalent to the `NEXTAUTH_URL` environment variable of NextAuth.js

##### origin

**You must set the `origin` in production, this includes when you run `npm run build`!** This is so that `nuxt-auth` can ensure that callbacks for authentication are correct. The `origin` consists out of (up to) 3 parts:
- scheme: `http` or `https`
- host: e.g., `localhost`, `example.org`, `www.sidebase.io`
- port: e.g., `:3000`, `:4444`; leave empty to implicitly set `:80` (this is an internet convention, don't ask)

For [the demo-app](https://nuxt-auth-example.sidebase.io) we set the `origin` to `https://nuxt-auth-example.sidebase.io`. If for some reason required, you can explicitly set the `origin` to `http://localhost:3000` to stop `nuxt-auth` from aborting `npm run build` when the origin is unset.

##### basePath

This is what tells the module where you added the authentication endpoints. Per default the `basePath` is set to `/api/auth`, so that means that the module expects that all requests to `/api/auth/*` will be handled by the `NuxtAuthHandler`.

To statify this, you need to create a [catch-all server-route](https://v3.nuxtjs.org/guide/directory-structure/server#catch-all-route) at that location by creating a file `~/server/api/auth/[...].ts` that exports the `NuxtAuthHandler`, see more on this in the [Quick Start](#quick-start) or in the [configuration section below](#serverapiauthts).

If you want to have the authentication at another location, you can overwrite the `basePath`, e.g., when setting:
- `basePath: "/api/_auth"` -> add the authentication catch-all endpoints into `~/server/api/_auth/[...].ts`
- `basePath: "/_auth"` -> add the authentication catch-all endpoints into `~/server/routes/_auth/[...].ts` (see [Nuxt server-routes docs on this](https://v3.nuxtjs.org/guide/directory-structure/server/#server-routes))

#### NuxtAuthHandler

Use the `NuxtAuthHandler({ ... })` to configure how the authentication itself behaves:
```ts
// file: ~/server/api/auth/[...].ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // your authentication configuration here!
})
```

The `NuxtAuthHandler` accepts [all options that NextAuth.js accepts for its API initialization](https://next-auth.js.org/configuration/options#options). Use this place to configure authentication providers (oauth-google, credential flow, ...), your `secret` (equivalent to `NEXTAUTH_SECRET` in NextAuth.js), add callbacks for authentication events, configure a custom logger and more. Read the linked `NextAuth.js` configuration to figure out how this works and what you can do.

##### Example with two providers

Here's what a full config can look like, wee allow authentication via a:
- Github Oauth flow,
- a username + password flow (called `CredentialsProvider`)

Note that the below implementation of the credentials provider is flawd and mostly copied over from the [NextAuth.js credentials example](https://next-auth.js.org/configuration/providers/credentials) in order to give a picture of how to get started with the credentials provider:
```ts
// file: ~/server/api/auth/[...].ts
import CredentialsProvider from 'next-auth/providers/credentials'
import GithubProvider from 'next-auth/providers/github'
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  providers: [
    // @ts-ignore Import is exported on .default during SSR, so we need to call it this way. May be fixed via Vite at some point
    GithubProvider.default({
      clientId: 'a-client-id',
      clientSecret: 'a-client-secret'
    })
    // @ts-ignore Import is exported on .default during SSR, so we need to call it this way. May be fixed via Vite at some point
    CredentialsProvider.default({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: 'Credentials',
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      credentials: {
        username: { label: 'Username', type: 'text', placeholder: 'jsmith' },
        password: { label: 'Password', type: 'password' }
      },
      authorize (credentials: any) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)
        // eslint-disable-next-line no-console
        console.log('provided credentials: ', credentials)
        const user = { id: '1', name: 'J Smith', email: 'jsmith@example.com' }

        if (user) {
          // Any object returned will be saved in `user` property of the JWT
          return user
        } else {
          // If you return null then an error will be displayed advising the user to check their details.
          return null

          // You can also Reject this callback with an Error thus the user will be sent to the error page with the error message as a query parameter
        }
      }
    })
  ]
})

```

Note that there's way more options inside the `nextAuth.options` object, see [here](https://next-auth.js.org/configuration/options#options) for all available options.

### Application-side usage

This module allows you user-data access, signing in, signing out and more [via `useSession`](#session-access-and-manipulation). It also allows you to defined [middleware that protects pages](#middleware).

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
await signIn()

// Trigger a sign in with a redirect afterwards, see https://next-auth.js.org/getting-started/client#signin
await signIn(undefined, { callbackUrl: '/protected' })

// Trigger a sign in via a specific authentication provider with a redirect afterwards, see https://next-auth.js.org/getting-started/client#signin
await signIn('github', { callbackUrl: '/protected' })

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

##### Redirects

You can also pass the `callbackUrl` option to both the `signIn` and the `signOut` method. This allows you to redirect a user to a certain pages, after they've completed the action. This can be useful when a user attempts to open a page (`/protected`) but has to go through external authentication (e.g., via their google account) first.

You can use it like:
```ts
await signIn({ callbackUrl: '/protected' })
```

to redirect the user to the protected page they wanted to access _after_ they've been authenticated.

You can do the same for signing out the user:
```ts
await signOut({ callbackUrl: '/protected' })
```

E.g., here to redirect the user away from the already loaded, protected, page after signout (else, you will have to handle the redirect yourself).

#### Middleware

You can use this library to define application middleware. This library supports all of [Nuxt's supported approaches](https://v3.nuxtjs.org/guide/directory-structure/middleware#middleware-directory), read on to learn how.

##### Global middleware

Create a global authentication middleware that ensures that your user is authenticated no matter which page they visit. Create a file in the `middleware` directory that has a `.global.ts` suffix.

It should look like this:

```ts
// file: ~/middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async () => {
  await useSession()
})
```

That's it! This middleware will fetch a session and if no active session exists for the current user redirect to the login screen. If you want to write custom redirect logic, you could alter the above code to only apply to specific routes.

Here is a global middleware that protects only the routes that start with `/secret/`:
```ts
// file: ~/middleware/auth.global.ts
export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path.startsWith('/secret/')) {
    await useSession()
  }
})
```

Example of a middleware that redirects to a custom login page:
```ts
// file: ~/middleware/auth.global.ts
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

##### Named middleware

Named middleware behave similar to [global middleware](#global-middleware) but are not automatically applied to any pages.

To use them, first create a middleware:
```ts
// file: ~/middleware/auth.ts
export default defineNuxtRouteMiddleware(async () => {
  await useSession()
})
```

Then inside your pages use the middleware with `definePageMeta`:
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

Note: `definePageMeta` can only be used inside the `pages/` directory.

Nuxt now calls the `auth.ts` middleware on every visit to this page.

##### Inline middleware

To define a named middleware, you need to use `definePageMeta` as described [in the nuxt docs](https://v3.nuxtjs.org/api/utils/define-page-meta/). Then you can just call `useSession` as in the other middleware. Here's an example that would protect just the page itself:
```vue
<!-- file: ~/pages/protected.vue -->
<template>
  <div>I'm a secret!</div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware () => useSession()
})
</script>
```

Note: `definePageMeta` can only be used inside the `pages/` directory

#### Server-side usage

On the server side you can get access to the current session like this:
```ts
import { getServerSession } from '#auth'

export default eventHandler(async (event) => {
  const session = await getServerSession(event)
})
```

This is inspired by [the getServerSession](https://next-auth.js.org/tutorials/securing-pages-and-api-routes#securing-api-routes) of NextAuth.js. It also avoids an external, internet call to the `GET /api/auth/sessions` endpoint, instead directly calling a pure JS-method.

##### Server-side endpoint protection

To protect an endpoint with, check the session after fetching it:
```ts
// file: ~/server/api/protected.get.ts
import { getServerSession } from '#auth'

export default eventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    return { status: 'unauthenticated!' }
  }
  return { status: 'authenticated!' }
})

```

##### Server-side middleware

You can also use this in a [Nuxt server middleware](https://v3.nuxtjs.org/guide/directory-structure/server#server-middleware) to protect multiple pages at once and keep the authentication logic out of your endpoints:
```ts
// file: ~/server/middleware/auth.ts
import { getServerSession } from '#auth'

export default eventHandler(async (event) => {
  const session = await getServerSession(event)
  if (!session) {
    throw createError({ statusMessage: 'Unauthenticated', statusCode: 403 })
  }
})
```

#### REST API

All endpoints that NextAuth.js supports are also supported by `nuxt-auth`:
- `GET /signin`,
- `POST /signin/:provider`,
- `GET/POST /callback/:provider`,
- `GET /signout`,
- `POST /signout`,
- `GET /session`,
- `GET /csrf`,
- `GET /providers`

You can directly interact with them if you wish to, it's probably a better idea to use `useSession` where possible though. [See the full rest API documentation of NextAuth.js here](https://next-auth.js.org/getting-started/rest-api).


#### Prior Work and Module Concept

The idea of this library is to re-use all the open-source implementation that already exist in the JS ecosystem instead of rolling our own. The idea was born when researching through the ecosystem of framework-specific authentication libraries to figure out what the best implementation approach for a state-of-the-art Nuxt 3 authentication library would be.

During research it became clear that implementing everything from scratch will be:
- a lot of work that has already been open-sourced by others,
- error prone as authentication has a lot of intricacies that need to be resolved in order to get it right,
- hard to maintain as authentication providers come and go,
- hard to build initial trust for as authentication is important and cannot go wrong,

In order to avoid these problems without taking forever (leaving Nuxt without an authentication library in the meantime), we decided to investigate if we can wrap [`NextAuth.js`](https://github.com/nextauthjs/next-auth), the most popular authentication library in the Next.js ecosystem by far and a trusted, well maintained one at that!

In our investigation we found prior attempts to make NextAuth.js framework agnostic. These have more or less come to fruition, so far mostly resulting in some PoCs and example apps. Looking at these was quite helpful to get started. In particular, big pushes in the right direction came from:
- [NextAuth.js app examples](https://github.com/nextauthjs/next-auth/tree/main/apps)
- [Various comments, proposals, ... of this thread](https://github.com/nextauthjs/next-auth/discussions/3942), special thanks to @brillout for starting the discussion, @balazsorban44 for NextAuth.js and encouraging the discussion, @wobsoriano for adding PoCs for multiple languages

The main part of the work was to piece everything together, resolve some outstanding issues with existing PoCs, add new things where nothing existed yet, e.g., for the client `useSession` composable by going through the NextAuth.js client code and translating it to a Nuxt 3 approach.

##### Project Roadmap

🚧 This project is under active development: A lot of stuff already works and as NextAuth.js handles the authentication under the hood, the module should already be ready for most use-cases. Still, some functionality is missing, e.g., we've focused on oauth-providers in the first implementation, so the credential- and email-flow are untested.

Roughly, the roadmap of `nuxt-auth` is:
1. Reach feature parity: There's still a lot of options, configuration and behavior from the client-side NextAuth.js module that we do not support yet. We first want to reach feature parity on this front + support the credential and email flow
2. Reach configuration & server-side parity: Extending the user data model, ensuring full typescript support in doing that, allowing correct configuration of all supported backends and session storage mediums
3. Fill in any missing gaps, add some of our own: There's many ideas we have to support extended user management, maybe discuss whether we want to better support the `local` / `credentials` flow than NextAuth.js does out of the box (they don't do it for good reasons, so, there really is an honest discussion to be had), adding more UI focused components that automatically and easily wrap your app in a nice auth page, ...

We also want to listen to all suggestions, feature requests, bug reports, ... from you. So if you have any ideas, please open an issue or reach out to us on Twitter or via E-Mail.

#### Module Playground

This module also has it's own playground, you can also use that to get familiar with it and play around a bit:
```sh
> git clone https://github.com/sidebase/nuxt-auth

> cd nuxt-auth

# **OPEN THE `~/playground/server/api/auth/[...].ts` and configure your own auth-provider

> npm i

> npm run dev:prepare

> npm run dev

# -> open http://localhost:3000
```

Note: The playground has considerably less polishing than the example page.

#### Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [the module playground](./playground) in development mode.
- Run `npm run lint` to run eslint
- Run `npm run type` to run typescheck via tsc
- Run `npm publish --access public` to publish (bump version before)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@sidebase/nuxt-auth/latest.svg
[npm-version-href]: https://npmjs.com/package/@sidebase/nuxt-auth

[npm-downloads-src]: https://img.shields.io/npm/dt/@sidebase/nuxt-auth.svg
[npm-downloads-href]: https://npmjs.com/package/@sidebase/nuxt-auth

[license-src]: https://img.shields.io/npm/l/@sidebase/nuxt-auth.svg
[license-href]: https://npmjs.com/package/@sidebase/nuxt-auth
