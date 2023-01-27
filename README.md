![nuxt-auth demo page](.github/nuxt-auth.jpg)

# 🔐 nuxt-auth

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars](https://badgen.net/github/stars/sidebase/nuxt-auth)](https://GitHub.com/sidebase/nuxt-auth/)
[![License][license-src]][license-href]
[![Follow us on Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/sidebase_io)
[![Join our Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/NDDgQkcv3s)

> `nuxt-auth` is a feature-packed, open-source authentication module for Nuxt 3 applications.

## Quick Start

```sh
npm i -D @sidebase/nuxt-auth
```

Then visit the [Quick Start documentation](https://sidebase.io/nuxt-auth/getting-started/quick-start) to setup the module.

## Features

`nuxt-auth` wraps [NextAuth.js](https://github.com/nextauthjs/next-auth) to offer the reliability & convenience of a 12k star library to the nuxt 3 ecosystem with a native developer experience (DX). Features of `nuxt-auth` include:
- ✔️ Authentication providers:
    - ✔️ OAuth (e.g., Github, Google, Twitter, Azure, ...)
    - ✔️ Custom OAuth (write it yourself)
    - ✔️ Credentials (password + username)
    - ✔️ Email Magic URLs
- ✔️ Isomorphic / Universal Auth Composable `useSession` supports:
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

## Demo Page

Visit the [`nuxt-auth` demo page here](https://nuxt-auth-example.sidebase.io/):
![nuxt-auth demo page](.github/nuxt-auth-demo.png)

You can find the [demo source-code here](https://github.com/sidebase/nuxt-auth-example).

## Development

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` to start [the module playground](./playground) in development mode.
- Run `npm run lint` to run eslint
- Run `npm run types` to run typescheck via tsc
- Run `npm publish --access public` to publish (bump version before)

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

> npm i

> npm run dev:prepare

> npm run dev

# -> open http://localhost:3000
```
