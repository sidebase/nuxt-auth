# Session data

This guide explains how to add custom data to the user session. In many cases, you may wish to adapt which information is returned by the authentication flow. This can depend on your provider or any additional API calls you may make to enrich the session data.

## Modify the JWT Token

In order to persist data between session requests, we need to inject certain information into the JWT token, which we can then access during subsequent session requests. However, avoid injecting too much data into the JWT token, as it is limited in size. We recommend only injecting an access or a session token, that can then be used to request further user information inside the session callback.

The JWT callback provides:
- `token`: The raw JWT token
- `account`, `profile`, `isNewUser`: The data returned by the OAuth provider. This data varies by provider, we recommend logging each value to inspect what data is included. These values are only avalible on creation of the JWT token, in subsequent requests only the `token` will be accessible.

```ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // your authentication configuration here!
  callbacks: {
    jwt({ token, account, profile }) {
      if (account) {
        token.sessionToken = account.session_token
      }
      return token
    },
  }
})
```

:::info
Any data injected into the JWT token, cannot be directly accessed from the frontend, however can be accessed on the server side using the `getToken` function.
:::

## Inject data into the Session

After enriching the JWT token with additional data, you can now access this data inside the `session` callback. The `session` callback is invoked every time the session data is requested. This can happen when using `useAuth`, `getServerSideSession` or when the session is refreshed.

```ts
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  // your authentication configuration here!
  callbacks: {
    async session({ session, token }) {
      // Token we injected into the JWT callback above.
      const token = token.sessionToken

      // Fetch data OR add previous data from the JWT callback.
      const additionalUserData = await $fetch(`/api/session/${token}`)

      // Return the modified session
      return {
        ...session,
        user: {
          name: additionalUserData.name,
          avatar: additionalUserData.avatar,
          role: additionalUserData.role
        }
      }
    },
  }
})
```

:::info
Any errors thrown inside the `session` callback will result in the session being terminated and the user being logged out.
:::

---

That's it! You can now access your new session data inside your application.

```vue
<script setup lang="ts">
const { data } = useAuth()
</script>

<template>
  <div v-if="data">
    <!-- You can access the session data you injected above! -->
    Hello, {{ data.user.name }}. You have the role: {{ data.user.role }}!
  </div>
</template>
```

## Typescript

When modifying the session or JWT objects, you may want to adjust the types accordingly, to ensure that you get proper intellisense and type support. [Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) can be used to inject additional type declarations into installed modules to overwrite or add additional data.

Begin by creating a new typescript file in the root of your project named: `next-auth.d.ts`. Typescript will automatically recognize that this file is augmenting the module types of `next-auth` (running under the hood).

```ts
// file: ~/next-auth.d.ts
import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  /* Returned by `useAuth`, `getSession` and `getServerSession` */
  interface Session extends DefaultSession {
    user: {
      name: string
      avatar: string
      role: 'admin' | 'manager' | 'user'
    }
  }
}
```

In addition to modifying the `session` data types, you can also extend the types of the JWT token. This allows you to receive proper type support when accessing the JWT token inside the NuxtAuthHandler or when calling `getToken` on the server side.

```ts
// file: ~/next-auth.d.ts
declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken` */
  interface JWT {
    sessionToken?: string
  }
}
```
