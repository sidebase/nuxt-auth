# Introduction

NuxtAuth is an open source Nuxt module that provides authentication for Nuxt 4 applications. It supports multiple authentication methods, allowing you to customize the ways users login to your application.

Through a direct integration into Nuxt, you can access and utlize the user sessions within your pages, components and composables directly.

## Features

### Authentication providers

- OAuth (eg. Github, Google, Twitter, Azure...)
- Custom OAuth (Add your own!)
- Credentials (username / email + password)
- Email Magic URLs

### Application Side Session Managment

- Session fetching with `status`, `data` and `lastRefreshedAt`
- Methods to `getSession`, `getCsrfToken`, `getProviders`, `signIn` and `signOut`
- Full TypeScript support for all methods and properties

### Application protection

- Application-side middleware protection for the full application or specific pages
- Server-side middleware and endpoint protection

## Common questions

### Why does NuxtAuth require NextAuth?

The `authjs` provider is able to provide all of its features by wrapping [Auth.js / NextAuth.js](https://github.com/nextauthjs/next-auth) under the hood. This gives the reliability & convenience of a >22.000 github star library to the Nuxt 4 ecosystem with a native nuxt developer experience (DX). Wrapping Auth.js / NextAuth.js has the second advantage that many OAuth providers, database adapters, callbacks and more are supported out-of-the-box. This also means that you can use all NextAuth.js and Auth.js guides and documentation to achieve things with the authjs provider of nuxt-auth.

NuxtAuth also provides Nuxt 4 specific features like a convenient application-side composable to login, logout, access user-authentication data or an authentication middleware and plugin that take care of managing the user authentication lifecycle by fetching authentication data on initial load, refreshing the user authentication on re-focusing the tab and more.

### What is the difference between Auth.js and NextAuth?

We use authjs everywhere to mean authjs and next-auth interchangably as next-auth is currently transitioning to become authjs (branded name: [Auth.js](https://authjs.dev/)).

We are following this transition and are changing code related to this as it becomes stable enough to use it. You can follow our implementation of this transition in [this issue](https://github.com/sidebase/nuxt-auth/issues/673). If you are googling anything related to this provider, we recommend that you still use the term `next-auth` as this is still the mainly used library and the stable one we mostly use under the hood. New features that are Auth.js only are _not_ guaranteed to work at the moment, as we still mostly rely on next-auth as a stable foundation.

### NextAuth `GHSA-v64w-49xw-qq89` vulnerability

NuxtAuth wraps NextAuth `v4.21.1` to provide the reliability and convenience of countless preconfigured and tested OAuth providers.In `v4.22` and above, NextAuth has changed their package exports, blocking NuxtAuth users from using the newer versions.

NextAuth versions under `4.22` are impacted by vulnerability [GHSA-v64w-49xw-qq89](https://github.com/advisories/GHSA-v64w-49xw-qq89), after doing an internal investigation into this vulnerability we could determine that NuxtAuth applications using this version are not affected.

::: details Further details
---
#### Description of the vulnerability
The vulnerability [GHSA-v64w-49xw-qq89](https://github.com/advisories/GHSA-v64w-49xw-qq89) only affects applications that rely on the default [Middleware authorization](https://next-auth.js.org/configuration/nextjs#middleware) provided by NextAuth.

The vulnerability allows attackers to create/mock a user, by accessing the JWT from an interrupted OAuth sign-in flow. They can then manually override the session cookie and simulate a login. However, doing this does **not** give access to the users data or permissions, but can allow attackers to view the layouts of protected pages.

#### Why does it not effect NuxtAuth?
As the affected middleware is written for Next.js, we wrote our own [custom middleware](https://github.com/sidebase/nuxt-auth/blob/main/src/runtime/middleware/auth.ts) for NuxtAuth that is not affected by the vulnerability.
:::
