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
      if (account && typeof account.session_token === 'string') {
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
      const sessionToken = token.sessionToken

      // Fetch data OR add previous data from the JWT callback.
      const additionalUserData = await $fetch<{
        name: string
        avatar: string
        role: 'admin' | 'manager' | 'user'
      }>(`/api/session/${sessionToken}`)

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
  <div v-if="data?.user">
    <!-- You can access the session data you injected above! -->
    Hello, {{ data.user.name }}. You have the role: {{ data.user.role }}!
  </div>
</template>
```

## Augmenting TypeScript types

When modifying the session, user, account or JWT objects, you may want to adjust the types accordingly, to ensure that you get proper intellisense and type support. [Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation) can be used to inject additional type declarations into the `next-auth` module used by the authjs provider.

Begin by creating a TypeScript declaration file (e.g. `shared/types/next-auth.d.ts`). In Nuxt 4, this location includes the declarations in both the app and server TypeScript projects. TypeScript will automatically recognize that this file is augmenting the module types of `next-auth`.

```ts
// file: shared/types/next-auth.d.ts
import type { DefaultSession, DefaultUser } from 'next-auth'

declare module 'next-auth' {
  /* Returned by `useAuth`, `getSession` and `getServerSession` */
  interface Session {
    user?: DefaultSession['user'] & {
      username?: string
      tenantId?: string
      role?: 'admin' | 'manager' | 'user'
    }

    accountTenantId?: string
  }

  /* Returned by the `authorize` callback and available in callbacks as `user` */
  interface User extends DefaultUser {
    username?: string
    tenantId?: string
    role?: 'admin' | 'manager' | 'user'
  }

  /* Available in callbacks as `account` */
  interface Account {
    providerTenantId?: string
  }
}

export {}
```

Extending `User` is important when you return custom fields from a provider or credentials `authorize` callback and then read them in callbacks. For example, `jwt` receives `user` as `User | AdapterUser`; adding fields to `User` makes these fields available.

```ts
// file: ~/server/api/auth/[...].ts
import CredentialsProvider from 'next-auth/providers/credentials'
import { NuxtAuthHandler } from '#auth'

export default NuxtAuthHandler({
  providers: [
    // @ts-expect-error Use .default here for it to work during SSR.
    CredentialsProvider.default({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        return {
          id: '1',
          name: credentials?.username,
          username: credentials?.username,
          tenantId: 'tenant_1',
          role: 'admin'
        }
      }
    })
  ],
  callbacks: {
    jwt({ token, user, account }) {
      // You can use the augmented `User` type in the callbacks
      if (user) {
        token.username = user.username
        token.tenantId = user.tenantId
      }

      if (account) {
        token.providerTenantId = account.providerTenantId
      }

      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.username = token.username
        session.user.tenantId = token.tenantId
      }

      session.accountTenantId = token.providerTenantId

      return session
    }
  }
})
```

In addition to modifying the `session`, `user` and `account` data types, you can also extend the types of the JWT token. This gives you control over the JWT token types inside the `NuxtAuthHandler` or when calling `getToken` on the server side.

```ts
// file: shared/types/next-auth.d.ts
declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken` */
  interface JWT {
    sessionToken?: string
    username?: string
    tenantId?: string
    providerTenantId?: string
  }
}
```

:::tip
For the authjs provider, augment `next-auth` and `next-auth/jwt`. The `#auth` import used by NuxtAuth follows those upstream AuthJS types, so you usually do not need to augment `#auth` directly.
:::
