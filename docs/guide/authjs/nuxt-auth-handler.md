# NuxtAuthHandler

The NuxtAuthHandler is an adaptation of the [NextAuthHandler](https://next-auth.js.org/configuration/options) built into AuthJS. You can learn more about how to setup a minimal version of the NuxtAuthHandler in the [Quick Start section](/guide/authjs/quick-start#nuxtauthhandler).

## Secret

The secret is a random string used to hash tokens, sign and encrypt cookie and generate cryptographic keys. In development the `secret` is automatically set to a SHA hash of the `NuxtAuthHandler`. In production we recommend setting a [runtimeConfig](https://nuxt.com/docs/guide/going-further/runtime-config) value to define a more secure value.

::: code-group
```ts [~/server/api/auth/[...].ts]
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  secret: useRuntimeConfig().authSecret,
  // your authentication configuration here!
})
```

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  runtimeConfig: {
    authSecret: '123',
  }
})
```

``` txt [.env]
NUXT_AUTH_SECRET="YOUR-SUPER-SECURE-SECRET"
```

:::

## Providers

The providers are the registered authentication methods that your users can use to login to your application. NuxtAuth provides a number of preconfigured providers you can use to quickly bootstrap your project. These include OAuth providers, [email-based providers](https://next-auth.js.org/configuration/providers/email) (Magic URLs) and a [credentials provider](https://next-auth.js.org/configuration/providers/credentials). In addition to using a pre-built provider, you can also create your own provider.

You can find an overview of all the prebuilt providers [here](https://next-auth.js.org/providers/). If you want to create your own provider, please visit the [NextAuth docs](https://next-auth.js.org/configuration/providers/oauth#using-a-custom-provider).

::: warning
`next-auth@4` providers require an additional `.default` to work in Vite. This will no longer be necessary in `next-auth@5` (`authjs`).

```ts
import GithubProvider from 'next-auth/providers/github'

export default NuxtAuthHandler({
  providers: [
    // @ts-expect-error You need to use .default here for it to work during SSR. May be fixed via Vite at some point
    GithubProvider.default({ // [!code focus]
      // GitHub provider configuration
    })
  ]
})
```
:::


## Callbacks

The callbacks inside the NuxtAuthHandler are asynchronous functions that allow you to hook into and modify the authentication flow. This is helpful for when you need to:

- Change the data inside the JWT token or Session Data
- Add support for refresh tokens

Callbacks are very powerful and allow you to modify the authentication flow based on your needs.

```ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // your authentication configuration here!
  callbacks: {
    /* on before signin */
    async signIn({ user, account, profile, email, credentials }) {
      return true
    },
    /* on redirect to another url */
    async redirect({ url, baseUrl }) {
      return baseUrl
    },
    /* on session retrival */
    async session({ session, user, token }) {
      return session
    },
    /* on JWT token creation or mutation */
    async jwt({ token, user, account, profile, isNewUser }) {
      return token
    }
  }
})
```

Some uses-cases for each callback could be:

- `signIn`: Check if a user is e.g. restricted from accessing the application and terminate the signin flow.
- `redirect`: Customize the callback url based on parameters that need to be dynamically calculated and cannot be set on startup (e.g. through feature flags or database values).
- `session`: Fetch and inject additional data into the session. Read more [here](/guide/authjs/session-data).
-  `jwt`: Inject or update data inside the JWT token and manage refresh and access tokens.

You can read more on each of these callbacks, what data they provide and what return value they expect on the offical [NextAuth docs](https://next-auth.js.org/configuration/callbacks).

## Events

Events are asynchronous callback functions invoked during certain actions in the authentication flow. They can be used to log certain events or debug your authentication flow.

```ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // your authentication configuration here!
  events: {
    async signIn(message) { /* on successful sign in */ },
    async signOut(message) { /* on signout */ },
    async createUser(message) { /* user created */ },
    async updateUser(message) { /* user updated - e.g. their email was verified */ },
    async linkAccount(message) { /* account (e.g. GitHub) linked to a user */ },
    async session(message) { /* session is active */ },
  }
})
```

You can read more on each of these events and what data they provide on the offical [NextAuth docs](https://next-auth.js.org/configuration/events).

## Pages

Inside the pages configuration, you can define custom routes that match your authentication related pages. Setting new pages here, will override the included default authentication pages, included with the module.

If you would like to learn more about custom pages and customization, please read the full guide [here](/guide/authjs/custom-pages).

```ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // your authentication configuration here!
  pages: {
    signIn: '/auth/signIn',
    signOut: '/auth/signOut',
    error: '/auth/error',
    verifyRequest: '/auth/verify-request',
    newUser: '/auth/new-user'
  }
})
```
