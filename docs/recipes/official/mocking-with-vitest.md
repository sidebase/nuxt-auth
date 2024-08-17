# Mocking with Vitest

<RecipeHeader type="official" author="zoey-kaiser" :providers="['authjs']" :tags="['testing', 'vitest']" />

In order to run end-to-end or component tests with Vitest, you will need to create a "mocked" version of the NuxtAuth composables for the test to interact with. In some cases if you are using the `local` or `refresh` provider with a Full-Stack application, you can also directly interact with your authentication API and mock the reponses inside your backend.

:::tip See the code
You can find the full code for this guide [here](https://github.com/zoey-kaiser/nuxt-auth-recipes/tree/mocking-with-vitest).
:::

## Add your mocked functions

Begin by creating a mocked version of the module functions provided by `@sidebase/nuxt-auth` inside `~/tests/mocks/auth.ts`.

```ts
import { eventHandler } from 'h3'

export const MOCKED_USER = {
  user: {
    role: 'admin',
    email: 'hi@sidebase.io',
    name: 'sidebase'
  }
}

// App-side mocks
export function useAuth() {
  return {
    data: ref(MOCKED_USER),
    status: ref('authenticated'),
    getSession: () => MOCKED_USER,
    signOut: () => {},
  }
}

// Server-side mocks
export const getServerSession = () => MOCKED_USER
export const NuxtAuthHandler = () => eventHandler(() => MOCKED_USER)
```

Inside this file, you can define any NuxtAuth composable (client-side or server-side) that you need to access inside your tests. Later on when Vitest is running, it will access these functions instead of the built-in ones from NuxtAuth. Therefore you can customize the `MOCKED_USER` to match your session data type.


## Setup the mocked module

Inside of `~/tests/mocks/setup.ts` create a new local Nuxt Module using the mocked functions defined above.

```ts
import { createResolver, defineNuxtModule } from '@nuxt/kit'

export default defineNuxtModule({
  setup: (_options, nuxt) => {
    const { resolve } = createResolver(import.meta.url)
    const pathToMocks = resolve('./auth.ts')

    nuxt.hook('imports:extend', (_imports) => {
      _imports.push({ name: 'useAuth', from: pathToMocks })
    })

    nuxt.hook('nitro:config', (nitroConfig) => {
      if (!nitroConfig.alias) {
        throw new Error('Alias must exist at this point, otherwise server-side cannot be mocked')
      }
      nitroConfig.alias['#auth'] = pathToMocks
    })
  },
})
```

## Update your `nuxt.config.ts`

Inside the `nuxt.config` import either `@sidebase/nuxt-auth` or your mocked version into the `modules` array, depending on the environment

```ts
// If vitest is running the application, overwrite using the mocked module
const mockAuthModule = process.env.VITEST ? ['./test/mocks/setup.ts'] : []

export default defineNuxtConfig({
  modules: [
    '@sidebase/nuxt-auth',
    ...mockAuthModule,
  ],
}
```

That's it! You can now use `@sidebase/nuxt-auth` inside your tests! We decided to not natively include a mocked version of the module, as the configuration of it highly depends on your setup. 

:::tip See the code
You can find the full code for this guide [here](https://github.com/zoey-kaiser/nuxt-auth-recipes/tree/mocking-with-vitest).
:::
