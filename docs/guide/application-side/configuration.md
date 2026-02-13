# Configuration

NuxtAuth offers a wide range of configuration options that can be defined inside the `nuxt.config.ts`. You can find an example of a fully configured `authjs` app below:

```ts
export default defineNuxtConfig({
  modules: ['@sidebase/nuxt-auth'],
  auth: {
    isEnabled: true,
    disableServerSideAuth: false,
    originEnvKey: 'AUTH_ORIGIN',
    baseURL: 'http://localhost:3000/api/auth',
    provider: { /* your provider config */ },
    sessionRefresh: {
      enablePeriodically: true,
      enableOnWindowFocus: true,
    }
  }
})
```

## `isEnabled`

- **Type**: `boolean`
- **Default**: `true`

Whether the module is enabled at all

## `originEnvKey`

- **Type**: `string`
- **Default**: `AUTH_ORIGIN`

The name of the environment variable that holds the full base URL of the application. This is used to determine the base URL of your application in production.

By default, NuxtAuth will look at `AUTH_ORIGIN` environment variable and `runtimeConfig.authOrigin`.

::: tip
If you want to use `runtimeConfig` and `NUXT_` prefixed environment variables, you need to make sure to also define the key inside `runtimeConfig`,
because otherwise Nuxt will not acknowledge your env variable ([issue #906](https://github.com/sidebase/nuxt-auth/issues/906), read more [here](https://nuxt.com/docs/guide/going-further/runtime-config#environment-variables)).

```ts [nuxt.config.ts]
export default defineNuxtConfig({
  auth: {
    // NUXT_YOUR_ORIGIN=https://example.com/api/auth
    originEnvKey: 'NUXT_YOUR_ORIGIN'
  },
  runtimeConfig: {
    yourOrigin: ''
  }
})
```
:::

::: warning
Please note that despite the misleading name of "origin", this variable actually expects the **full** base URL, including the origin and pathname, e.g. `http://localhost:3000/api/auth`.

The configuration field name was chosen when the module relied on origins only. For better clarity the `originEnvKey` name will be deprecated in v1 and fully renamed in v2 in favor of a more speaking configuration.
:::

You can read additional information on `baseURL` determining [here](../advanced/url-resolutions.md).

## `disableServerSideAuth`

- **Type**: `boolean`
- **Default**: `false`

Forces your server to send a "loading" authentication status on all requests, thus prompting the client to do a fetch. If your website has caching, this prevents the server from caching someone's authentication status. This affects the entire site; for route-specific rules add `disableServerSideAuth` on `routeRules`. Read more [here](/guide/advanced/caching).

## `baseURL`

- **Type**: `string | undefined`

The full URL at which the app will run combined with the path to authentication. You should only use `baseURL` if you want to set it statically for your application.

You can read additional information on `origin` and `baseURL` determining [here](/resources/error-reference#auth-no-origin).

::: tip
If you would like to overwrite the `baseURL` at the runtime you can use the [`originEnvKey`](#originenvkey).
:::

## `provider`

- **Type**: `ProviderAuthjs | ProviderLocal`
- **Default**: `undefined`

Configuration of the authentication provider. Different providers are supported:
- AuthJS: See [configuration options here](/guide/authjs/quick-start#configuration)
- Local: See [configuration options here](/guide/local/quick-start)

## `sessionRefresh`

- **Type**: `SessionConfig | boolean`
- **Default**: `{ enablePeriodically: false, enableOnWindowFocus: true, refreshHandler: RefreshHandler }`

Configuration of the application-side session. You can configure the following attributes:

### `enablePeriodically`

- **Type**: `boolean | number`
- **Default**: `false`

Whether to refresh the session every `X` milliseconds. The refresh will only happen if a session already exists.
Setting this to a number `X` will refresh the session every `X` milliseconds.
Setting this to `true` is equivalent to `enablePeriodically: 1000`, the session will be refreshed every second.
Setting this to `false` will turn the session refresh off.

### `enableOnWindowFocus`

- **Type**: `boolean`
- **Default**: `true`

Whether to refresh the session every time the browser window is refocused.

### `refreshHandler`

- **Type**: `string`
- **Default:** `undefined`

To customize the session refreshing you can provide the path to your refresh handler. When setting this option, `enablePeriodically` and `enableOnWindowFocus` are ignored.

A custom `RefreshHandler` requires `init` and `destroy` functions:

- `init` will be called when the nuxt application is mounted. Here you may add event listeners and initialize custom refresh behaviour.
- `destroy` will be called when your app is unmounted. Here you may run your clean up routine e.g. to remove your event listeners.

::: code-group
```ts [nuxt.config.ts]
export default defineNuxtConfig({
  auth: {
    sessionRefresh: {
      // You can place it anywhere and name as you wish
      handler: './config/AuthRefreshHandler'
    }
  }
})
```

```ts [~/config/AuthRefreshHandler.ts]
import type { RefreshHandler } from '@sidebase/nuxt-auth'

// You may also use a plain object with `satisfies RefreshHandler`
class CustomRefreshHandler implements RefreshHandler {
  init(): void {
    console.info('Use the full power of the refreshHandler!')
  }

  destroy(): void {
    console.info(
      'Hover above class properties or go to their definition '
      + 'to learn more about how to craft a refreshHandler'
    )
  }
}

export default new CustomRefreshHandler()
```

If no custom RefreshHandler is defined, the [built-in-handler](https://github.com/sidebase/nuxt-auth/blob/main/src/runtime/utils/refreshHandler.ts) will be used to handle refreshes.

## `globalAppMiddleware`

- **Type:** `GlobalMiddlewareOptions | boolean`
- **Default**: `false`

Whether to add a global authentication middleware that protects all pages. Can be either `false` to disable, `true` to enable with defaults or an object to enable with provided options.

- If you **enable** this, everything is going to be protected and you can selectively disable protection for some pages by specifying `definePageMeta({ auth: false })`
- If you **disable** this, everything is going to be public and you can selectively enable protection for some pages by specifying `definePageMeta({ auth: true })`

Read more about [protecting pages](/guide/application-side/protecting-pages).
