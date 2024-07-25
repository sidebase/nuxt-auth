# Introduction

NuxtAuth is an open source Nuxt module that provides authentication for Nuxt 3 applications. It supports multiple authentication methods, allowing you to customize the ways users login to your application.

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

### Why does NuxtAuth require AuthJS?

The `authjs` provider is able to provide all of its features by wrapping [Auth.js](https://authjs.dev/) under the hood. This gives the reliability & convenience of a >22.000 github star library to the Nuxt 3 ecosystem with a native nuxt developer experience (DX). Wrapping Auth.js has the second advantage that many OAuth providers, database adapters, callbacks and more are supported out-of-the-box. This also means that you can use all Auth.js guides and documentation to achieve things with the authjs provider of nuxt-auth.

NuxtAuth also provides Nuxt 3 specific features like a convenient application-side composable to login, logout, access user-authentication data or an authentication middleware and plugin that take care of managing the user authentication lifecycle by fetching authentication data on initial load, refreshing the user authentication on re-focusing the tab and more.
