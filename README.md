# @zitadel/nuxt-auth

<!-- Badges Start -->
<p>
  <a href="https://npmjs.com/package/@zitadel/nuxt-auth">
    <img src="https://img.shields.io/npm/v/@zitadel/nuxt-auth.svg?style=flat-square&colorA=202128&colorB=36936A" alt="Version">
  </a>
  <a href="https://npmjs.com/package/@zitadel/nuxt-auth">
    <img src="https://img.shields.io/npm/dm/@zitadel/nuxt-auth.svg?style=flat-square&colorA=202128&colorB=36936A" alt="Downloads">
  </a>
  <a href="https://github.com/zitadel/nuxt-auth/stargazers">
    <img src="https://img.shields.io/github/stars/zitadel/nuxt-auth.svg?style=flat-square&colorA=202128&colorB=36936A" alt="Stars">
  </a>
  <a href="https://github.com/zitadel/nuxt-auth/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/zitadel/nuxt-auth.svg?style=flat-square&colorA=202128&colorB=36936A" alt="License">
  </a>
</p>
<!-- Badges End -->

> Authentication built for Nuxt 4! Easily add authentication via OAuth providers, credentials or Email Magic URLs!

## Quick Start

```sh
npm i -D @zitadel/nuxt-auth
```

Add the module to your `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@zitadel/nuxt-auth']
})
```

## Features

`@zitadel/nuxt-auth` is a library with the goal of supporting authentication for any universal Nuxt 4 application using [Auth.js](https://authjs.dev/) to offer the reliability & convenience of a 23k star library to the Nuxt 4 ecosystem with a native developer experience (DX).

### Authentication providers:
- OAuth (e.g., Github, Google, Twitter, Azure, ...)
- Custom OAuth (write it yourself)
- Credentials (password + username)
- Email Magic URLs

### Application Side Session Management using `useAuth`
- Session fetching with `status`, `data` and `lastRefreshedAt`
- Methods to `getSession`, `getCsrfToken`, `getProviders`, `signIn` and `signOut`
- Full TypeScript support for all methods and properties

### Application protection
- Application-side middleware protection for the full application or specific pages
- Server-side middleware and endpoint protection

### Advanced features for session life-cycle management
- Pre-built and customizable refresh behaviour
  - Refresh the session periodically
  - Refresh the session on tab-refocus
  - One time session fetch on page load, afterwards for specific actions (e.g., on navigation)
- Completely configure the refresh behaviour of your application using the `RefreshHandler`

### Server Side utilities
- Session access using `getServerSession`
- JWT Token access using `getToken`
- Server-side middleware and endpoint protection

## Development

This project uses `npm` for development.

- Run `npm run dev:prepare` to generate type stubs.
- Use `npm run dev` inside a module playground directory to start a playground in development mode.
- Run `npm run lint` to run eslint
- Run `npm run typecheck` to run typecheck via tsc

### Module Playground

This module also has its own playground:

```sh
git clone https://github.com/zitadel/nuxt-auth
cd nuxt-auth/playground-authjs
npm install
npm run dev:prepare
npm run dev
```

## Contributing

Thank you to everyone who has contributed to this project by writing issues or opening pull requests.

## License

This project is licensed under the MIT License.
