# Configuration

NuxtAuth offers a wide range of configuration options that can be defined inside the `nuxt.config.ts`. You can find an example of a fully configured `authjs` app below:

```ts
export default defineNuxtConfig({
    modules: ['@sidebase/nuxt-auth'],
    auth: { /* The Auth Config */ }
})
```

## `isEnabled`

- **Type**: `boolean`
- **Default**: `true`

Whether the module is enabled at all

## `disableServerSideAuth`

- **Type**: `boolean`
- **Default**: `false`

Forces your server to send a "loading" authentication status on all requests, thus prompting the client to do a fetch. If your website has caching, this prevents the server from caching someone's authentication status. This effects the entire site, for route-specific rules, add `disableServerSideAuth` on `routeRules`. Read more [here](/guide/advanced/caching).

## `baseURL`

- **Type**: `string | undefined`
- **Default**:
  - AuthJS Provider:
    - _Development_: `http://localhost:3000/api/auth`
    - _Production_: `undefined`
  - Local / Refresh Provider: `/api/auth`

The full url at which the app will run combined with the path to authentication. You can set this differently depending on your selected authentication-provider:

- `authjs`: You must set the full URL, with origin and path in production. You can leave this empty in development
- `local`: You can set a full URL, but can also leave this empty to fallback to the default value of `/api/auth` or set only the path.

### `authjs`

`baseURL` can be `undefined` during development but _must_ be set to the combination of origin + path that points to your `NuxtAuthHandler` for production. The origin consists out of:
- **scheme**: http / https
- **host**: e.g., localhost, example.org, google.com
- **port**: _empty_ (implies `:80` for http and `:443` for https), :3000, :8888
- **path**: the path that directs to the location of your `NuxtAuthHandler` e.g. `/api/auth`

### `local` and `refresh`

Defaults to `/api/auth` for both development and production. Setting this is optional, if you set it you can set it to either:
- just a path: Will lead to `nuxt-auth` using `baseURL` as a relative path appended to the origin you deploy to. Example: `/backend/auth`
- an origin and a path: Will lead to `nuxt-auth` using `baseURL` as an absolute request path to perform requests to. Example: `https://example.com/auth`

:::warning
If you point to a different origin than the one you deploy to you likely have to take care of CORS: Allowing cross origin requests.
:::

## `provider`

- **Type**: `ProviderAuthjs | ProviderLocal | ProviderRefresh`
- **Default**: `undefined`

Configuration of the authentication provider. Different providers are supported:
- AuthJS: See configuration options [here](/guide/authjs/quick-start#configuration)
- Local / Refresh: See configuration options [here](/guide/local/quick-start)

## `sessionRefresh`

- **Type**: `SessionConfig | boolean`
- **Default**: `{ enablePeriodically: false, enableOnWindowFocus: true, refreshHandler: RefreshHandler }`

Configuration of the application-side session. You can configure the following attributes:

### `enablePeriodically`

- **Type**: `boolean | number`
- **Default**: `undefined`

Whether to refresh the session every `X` milliseconds. Set this to `false` to turn it off. The session will only be refreshed if a session already exists. Setting this to `true` will refresh the session every second. Setting this to `false` will turn off session refresh. Setting this to a number `X` will refresh the session every `X` milliseconds.

### `enableOnWindowFocus`


- **Type**: `boolean`
- **Default**: `true`

Whether to refresh the session every time the browser window is refocused.

### `refreshHandler`

- **Type**: `RefreshHandler`
- **Default:** `undefined`

To customize the session refreshing you can provide a refresh handler. A custom `RefreshHandler` requires an `init`- and a `destroy`-function.

- `init` will be called when the nuxt application is mounted. Here you may add event listeners and initialize custom refresh behaviour. The method will receive a `RefreshHandlerConfig`. The type consists of `enablePeriodically` & `enableOnWindowFocus`.
- `destroy` will be called when your app is unmounted. Here you may run your clean up routine e.g. to remove your event listeners.

```ts
// file: ~/auth/refreshHandler.ts
import type { RefreshHandler } from '@sidebase/nuxt-auth'

// You may also use a plain object with `satisfies RefreshHandler`
class CustomRefreshHandler implements RefreshHandler {
  init (): void {
    console.info('Use the full power of the refreshHandler!')
  }

  destroy (): void {
    console.info(
      'Hover above class properties or go to their definition ' +
      'to learn more about how to craft a refreshHandler'
    )
  }
}

export default new CustomRefreshHandler()
```

If no custom RefreshHandler is defined, the [built-in-handler](https://github.com/sidebase/nuxt-auth/blob/main/src/runtime/utils/refreshHandler.ts) will be used to handle refreshes.

### `globalAppMiddleware`

- **Type:** `GlobalMiddlewareOptions | boolean`
- **Default**: `false`

Whether to add a global authentication middleware that protects all pages. Can be either `false` to disable, `true` to enabled or an object to enable and apply extended configuration.

- If you **enable** this, everything is going to be protected and you can selectively disable protection for some pages by specifying `definePageMeta({ auth: false })`
- If you **disable** this, everything is going to be public and you can selectively enable protection for some pages by specifying `definePageMeta({ auth: true })`

Read more about [protecting pages](/guide/application-side/protecting-pages).