![nuxt-auth demo page](.github/nuxt-auth.jpg)

# 🔐 nuxt-auth

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars](https://badgen.net/github/stars/sidebase/nuxt-auth)](https://GitHub.com/sidebase/nuxt-auth/)
[![License][license-src]][license-href]
[![Follow us on Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/sidebase_io)
[![Join our Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/NDDgQkcv3s)

> `nuxt-auth` is a feature-packed, open-source authentication module for Nuxt 3 applications.
> Starting with v0.6 `nuxt-auth` also supports static Nuxt applications

## Quick Start

```sh
npm i -D @sidebase/nuxt-auth
```

Then visit the [Quick Start documentation](https://sidebase.io/nuxt-auth/getting-started/quick-start) to setup the module for <= v0.5.

Visit the [Quick Start documentation](https://sidebase.io/nuxt-auth/0.6/getting-started/quick-start) to setup the module for >= v0.6.

## Features

`nuxt-auth` is a library with the goal of supporting authentication for any universal Nuxt 3 application. At the moment two providers are supported:
- [Auth.js / NextAuth.js](https://github.com/nextauthjs/next-auth) to offer the reliability & convenience of a 12k star library to the nuxt 3 ecosystem with a native developer experience (DX)
- `local` for static pages that rely on an external backend with a credential flow for authentication. `local` is supported starting with v0.6 of the module

Features of the `authjs`-provider of `nuxt-auth` include:
- ✔️ Authentication providers:
    - ✔️ OAuth (e.g., Github, Google, Twitter, Azure, ...)
    - ✔️ Custom OAuth (write it yourself)
    - ✔️ Credentials (password + username)
    - ✔️ Email Magic URLs
- ✔️ Isomorphic / Universal Auth Composable `useAuth` supports:
    - actions: `getSession`, `getCsrfToken`, `getProviders`, `signIn`, `signOut`
    - getters: `status`, `data`, `lastRefreshedAt`
    - full typescript support for all methods and property
- ✔️ Application-side middleware protection
- ✔️ Server-side middleware and endpoint protection
- ✔️ Advanced features for session life-cycle management:
    - Refresh the session periodically
    - Refresh the session on tab-refocus
    - One time session fetch on page load, afterwards for specific actions (e.g., on navigation)
    - 🚧 Session broadcasting between tabs (see #70)
- ✔️ Persistent sessions across requests
- ✔️ REST API:
    - `GET /signin`,
    - `POST /signin/:provider`,
    - `GET/POST /callback/:provider`,
    - `GET /signout`,
    - `POST /signout`,
    - `GET /session`,
    - `GET /csrf`,
    - `GET /providers`

You can find a feature-table of all starting with v0.6 in the [nuxt-auth "next"-version-docs](https://sidebase.io/nuxt-auth/0.6/getting-started).

## Demo Page

Visit the [`nuxt-auth` demo page here](https://nuxt-auth-example.sidebase.io/):
![nuxt-auth demo page](.github/nuxt-auth-demo.png)

You can find the [demo source-code here](https://github.com/sidebase/nuxt-auth-example).

## Development

This project uses `pnpm` for development.

- Run `pnpm dev:prepare` to generate type stubs.
- Use `pnpm dev` to start [the module playground](./playground) in development mode.
- Run `pnpm lint` to run eslint
- Run `pnpm typecheck` to run typescheck via tsc
- Run `pnpm publish --access public` to publish (bump version before)

<!-- Badges -->
[npm-version-src]: https://img.shields.io/npm/v/@sidebase/nuxt-auth/latest.svg
[npm-version-href]: https://npmjs.com/package/@sidebase/nuxt-auth

[npm-downloads-src]: https://img.shields.io/npm/dt/@sidebase/nuxt-auth.svg
[npm-downloads-href]: https://npmjs.com/package/@sidebase/nuxt-auth

[license-src]: https://img.shields.io/npm/l/@sidebase/nuxt-auth.svg
[license-href]: https://npmjs.com/package/@sidebase/nuxt-auth

### Module Playground

This module also has it's own playground:
```sh
> git clone https://github.com/sidebase/nuxt-auth

> cd nuxt-auth

# **OPEN THE `~/playground/server/api/auth/[...].ts` and configure your own auth-provider

> pnpm i

> pnpm dev:prepare

> pnpm dev

# -> open http://localhost:3000
```

#### Testing different Providers

We make use of the Nuxt 3 layers feature to quickly test different authentication providers. [Read the docs for more on the layers-feature](https://nuxt.com/docs/getting-started/layers). To use one of the layers edit the `playground/nuxt.config.ts` file. E.g., to test the `local` provider use:
```ts
export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  extends: ['../examples/local']
})
```

To test the `authjs` provider use:
```ts
export default defineNuxtConfig({
  modules: ['../src/module.ts'],
  extends: ['../examples/authjs']
})
```

Both will automatically provide different backends and configuration!
