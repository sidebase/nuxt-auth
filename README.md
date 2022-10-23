# nuxt-user

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![GitHub stars](https://badgen.net/github/stars/sidebase/nuxt-user)](https://GitHub.com/sidebase/nuxt-user/)
[![License][license-src]][license-href]
[![Follow us on Twitter](https://badgen.net/badge/icon/twitter?icon=twitter&label)](https://twitter.com/sidebase_io)
[![Join our Discord](https://badgen.net/badge/icon/discord?icon=discord&label)](https://discord.gg/9MUHR8WT9B)

> Nuxt 3 user authentication and authorization via [NextAuth.js](https://github.com/nextauthjs/next-auth) 🔑

## Wrapper status

Supported from https://next-auth.js.org/getting-started/client:

- `useSession`:
    - client: ❌
    - server: N/A
- SessionProvider
    - client: not needed (hypothesis, TBD!)
    - servier: N/A

## Prior Work

This implementation is (as probably all implementations are) based on prior work:
- nextauth apps/
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
