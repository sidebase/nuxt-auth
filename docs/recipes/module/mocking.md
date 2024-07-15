# Mocking with Vitest

In order to run end-to-end or component tests with Vitest, you will need to create a "mocked" version of the NuxtAuth composables for the test to interact with. In some cases if you are using the `local` or `refresh` provider with a Full-Stack application, you can also directly interact with your authentication API and mock the reponses inside your backend.

## Setup the mocked module

Inside of `~/tests/mock/nuxt-auth/setup.ts` create a new local Nuxt Module:

```ts
import { createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup: (_options, nuxt) => {
    const { resolve } = createResolver(import.meta.url)
    const pathToMocks = resolve('./module.ts')

    nuxt.hook('imports:extend', (_imports) => {
      _imports.push({ name: 'useAuth', from: pathToMocks })
    })

    nuxt.hook('nitro:config', (nitroConfig) => {
      if (!nitroConfig.alias) {
        throw new Error('Alias must exist at this point')
      }
      nitroConfig.alias['#auth'] = pathToMocks
    })
  },
})
```

## Add your mocked functions

Inside of the `setup` file an import is made of all the functions inside `~/tests/mock/nuxt-auth/module.ts`

```ts
import { eventHandler } from 'h3'

export const MOCKED_USER = { 
  user: { 
    role: 'admin', 
    email: 'test@example.com', 
    name: 'John Doe'
  }
}

// Client-side mocks
export const useAuth = () => ({
  data: ref(MOCKED_USER),
  status: ref('authenticated'),
  getSession: () => MOCKED_USER,
  signOut: () => {},
})

// Server-side mocks
export const getServerSession = () => MOCKED_USER
export const NuxtAuthHandler = () => eventHandler(() => MOCKED_USER)
```

Inside this file, you can define any NuxtAuth composable (client-side or server-side) that you need to access inside your tests. Later on when Vitest is running, it will access these functions instead of the built-in ones from NuxtAuth. Therefore you can customize the `MOCKED_USER` to match your session data type.

## Update your `nuxt.config.ts`

Inside the `nuxt.config` import either `@sidebase/nuxt-auth` or your mocked version into the `modules` array, depending on the environment

```ts
// If vitest is running the application, use the mocked module
const authModule = process.env.VITEST 
  ? ['./test/mock/nuxt-auth/setup.ts'] 
  : ['@sidebase/nuxt-auth']

export default defineNuxtConfig({
  modules: [
    ...authModule,
  ],
}
```

That's it! You can now use `@sidebase/nuxt-auth` inside your tests! We decided to not natively include a mocked version of the module, as the configuration of it highly depends on your setup. 
