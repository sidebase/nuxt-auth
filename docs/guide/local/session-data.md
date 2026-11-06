# Session data

To configure the types returned by your backend API, you can define an additional object inside the `nuxt.config.ts` that outlines the types of your session data object.
The primary way of doing it is using TypeScript module augmentation, but the legacy `session.dataType` is also still supported.

The session type is empty by default. Declare the fields your backend returns, including `id` if present, using one of the approaches below. These declarations only affect TypeScript types; they do not change or validate the backend response.

## Augmenting TypeScript types

You can type the local provider session data with [module augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation). This is especially useful when your session type already exists somewhere else in your app.

Create a `.d.ts` file that is included by TypeScript, for example `~/auth.d.ts`:

::: code-group

```ts [Option 1 - simple definition]
// file: ~/auth.d.ts
interface UserSubscription {
  id: number
  active: boolean
}

declare module '#auth' {
  interface SessionData {
    id: string | number
    firstName: string
    lastName: string
    role: 'admin' | 'manager' | 'user'
    subscriptions: UserSubscription[]
  }
}

// Turn this file into a module so TypeScript augments instead of replacing types.
export {}
```

```ts [Option 2 - import your types]
// file: ~/auth.d.ts
import type { BackendSession } from './your/session/types'

declare module '#auth' {
  interface SessionData extends BackendSession {}
}

// Turn this file into a module so TypeScript augments instead of replacing types.
export {}
```

:::

`SessionData` can then be used by:
- `useAuth().data`
- `useAuthState().data`
- `useAuth().getSession()`

```vue
<script setup lang="ts">
const { data, getSession } = useAuth()

if (data.value) {
  data.value.role // will show 'admin' | 'manager' | 'user'
}

const session = await getSession()
session?.subscriptions
</script>
```

## Legacy alternative `session.dataType`

You can also augment the types using `session.dataType` inside `nuxt.config.ts`.

```ts
export default defineNuxtConfig({
  auth: {
    provider: {
      type: 'local',
      session: {
        dataType: {
          id: 'string | number',
          firstName: 'string',
          lastName: 'string',
        },
      },
    }
  }
})
```

In the example above, NuxtAuth will properly infer the types from the configuration and return:

```ts
interface SessionData {
  id: string | number
  firstName: string
  lastName: string
}
```

### Complex types

In addition to using simple type such as `string`, `number` or `boolean` you can also configure more complex types such as sub-objects or arrays.

```ts
export default defineNuxtConfig({
  auth: {
    provider: {
      type: 'local',
      session: {
        dataType: {
          id: 'string | number',
          firstName: 'string',
          lastName: 'string',
          subscriptions: '{ id: number, active: boolean }[]'
        },
      }
    }
  }
})
```

Example above will generate the following type for your session:
```ts
interface SessionData {
  id: string | number
  firstName: string
  lastName: string
  subscriptions: { id: number, active: boolean }[]
}
```

This allows you to properly match the types to the return values of `getSession`.
